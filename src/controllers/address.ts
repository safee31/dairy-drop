import asyncHandler from "../utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { auditLogger } from "../utils/logger";
import { AppDataSource } from "@/config/database";
import { User } from "@/models/User";
import { Address } from "@/models/Address";

export const getUserAddresses = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { page = 1, limit = 10, isPrimary, isActive, sortBy = "createdAt", sortOrder = "desc" } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const addressRepository = AppDataSource.getRepository(Address);
  const queryBuilder = addressRepository.createQueryBuilder("address")
    .where("address.userId = :userId", { userId });

  if (isPrimary !== undefined) {
    queryBuilder.andWhere("address.isPrimary = :isPrimary", { isPrimary: isPrimary === "true" });
  }
  if (isActive !== undefined) {
    queryBuilder.andWhere("address.isActive = :isActive", { isActive: isActive === "true" });
  }

  const total = await queryBuilder.getCount();
  const addresses = await queryBuilder
    .orderBy(`address.${String(sortBy)}`, String(sortOrder).toUpperCase() as "ASC" | "DESC")
    .skip(skip)
    .take(Number(limit))
    .getMany();

  return responseHandler.success(
    res,
    {
      addresses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
    "Addresses retrieved successfully",
  );
});

export const getAddressById = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const userId = req.user?.id as string;

  const addressRepository = AppDataSource.getRepository(Address);
  const address = await addressRepository.findOneBy({ id, userId });

  if (!address) {
    return responseHandler.error(res, "Address not found", 404);
  }

  return responseHandler.success(res, { address }, "Address retrieved successfully");
});

export const createAddress = asyncHandler(async (req, res) => {
  const userId = req.user?.id as string;
  const { isPrimary, ...addressData } = req.body;

  const addressRepository = AppDataSource.getRepository(Address);

  if (isPrimary) {
    await addressRepository.update(
      { userId, isPrimary: true },
      { isPrimary: false }
    );
  }

  const addressDataToSave: Partial<Address> = {
    userId,
    isPrimary: isPrimary || false,
    ...addressData,
  };

  const address = addressRepository.create(addressDataToSave);
  const savedAddress = await addressRepository.save(address);

  auditLogger.info("Address created", {
    userId,
    addressId: savedAddress.id,
    label: savedAddress.label,
  });

  return responseHandler.success(
    res,
    { address },
    "Address created successfully",
    201,
  );
});

export const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const userId = req.user?.id as string;
  const { isPrimary, ...addressData } = req.body;

  const addressRepository = AppDataSource.getRepository(Address);
  const address = await addressRepository.findOneBy({ id, userId });

  if (!address) {
    return responseHandler.error(res, "Address not found", 404);
  }

  if (isPrimary) {
    await addressRepository.update(
      { userId, isPrimary: true, id },
      { isPrimary: false }
    );
  }

  Object.assign(address, addressData);
  if (isPrimary !== undefined) {
    address.isPrimary = isPrimary;
  }
  await addressRepository.save(address);

  auditLogger.info("Address updated", {
    userId,
    addressId: id,
  });

  return responseHandler.success(
    res,
    { address },
    "Address updated successfully",
  );
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const userId = req.user?.id as string;

  const addressRepository = AppDataSource.getRepository(Address);
  const address = await addressRepository.findOneBy({ id, userId });

  if (!address) {
    return responseHandler.error(res, "Address not found", 404);
  }

  const addressCount = await addressRepository.countBy({ userId, isActive: true });
  if (addressCount === 1) {
    return responseHandler.error(
      res,
      "Cannot delete the only address. Please add another address first.",
      400,
    );
  }

  address.isActive = false;
  await addressRepository.save(address);

  if (address.isPrimary) {
    const nextAddress = await addressRepository.findOne({
      where: { userId, isActive: true },
      order: { createdAt: "ASC" },
    });

    if (nextAddress) {
      nextAddress.isPrimary = true;
      await addressRepository.save(nextAddress);
    }
  }

  auditLogger.info("Address deleted", {
    userId,
    addressId: id,
  });

  return responseHandler.success(res, {}, "Address deleted successfully");
});

export const setPrimaryAddress = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const userId = req.user?.id as string;

  const addressRepository = AppDataSource.getRepository(Address);
  const address = await addressRepository.findOneBy({ id, userId });

  if (!address) {
    return responseHandler.error(res, "Address not found", 404);
  }

  if (!address.isActive) {
    return responseHandler.error(res, "Cannot set inactive address as primary", 400);
  }

  await addressRepository.update(
    { userId, isPrimary: true },
    { isPrimary: false }
  );

  address.isPrimary = true;
  await addressRepository.save(address);

  auditLogger.info("Primary address updated", {
    userId,
    addressId: id,
  });

  return responseHandler.success(
    res,
    { address },
    "Primary address updated successfully",
  );
});

export default {
  getUserAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setPrimaryAddress,
};
