import asyncHandler from "../utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { auditLogger } from "../utils/logger";

import { prisma }  from "@/config/database";


export const getUserAddresses = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { page = 1, limit = 10, isPrimary, isActive, sortBy = "createdAt", sortOrder = "desc" } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const where: any = { userId };
  if (isPrimary !== undefined) where.isPrimary = isPrimary === "true";
  if (isActive !== undefined) where.isActive = isActive === "true";

  const [total, addresses] = await Promise.all([
    prisma.address.count({ where }),
    prisma.address.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: {
        [String(sortBy)]: String(sortOrder).toLowerCase(),
      },
    }),
  ]);

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
  const { id } = req.params;
  const userId = req.user?.id;

  const address = await prisma.address.findFirst({
    where: { id, userId },
  });

  if (!address) {
    return responseHandler.error(res, "Address not found", 404);
  }

  return responseHandler.success(res, { address }, "Address retrieved successfully");
});

export const createAddress = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { isPrimary, ...addressData } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isVerified) {
    return responseHandler.error(
      res,
      "Please verify your email before adding addresses",
      400,
    );
  }

  if (isPrimary) {
    await prisma.address.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      userId,
      isPrimary: isPrimary || false,
      ...addressData,
    },
  });

  auditLogger.info("Address created", {
    userId,
    addressId: address.id,
    label: address.label,
  });

  return responseHandler.success(
    res,
    { address },
    "Address created successfully",
    201,
  );
});

export const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { isPrimary, ...addressData } = req.body;

  const address = await prisma.address.findFirst({
    where: { id, userId },
  });

  if (!address) {
    return responseHandler.error(res, "Address not found", 404);
  }

  if (isPrimary) {
    await prisma.address.updateMany({
      where: { userId, isPrimary: true, id: { not: id } },
      data: { isPrimary: false },
    });
  }

  const updatedAddress = await prisma.address.update({
    where: { id },
    data: {
      ...addressData,
      ...(isPrimary !== undefined && { isPrimary }),
    },
  });

  auditLogger.info("Address updated", {
    userId,
    addressId: id,
  });

  return responseHandler.success(
    res,
    { address: updatedAddress },
    "Address updated successfully",
  );
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const address = await prisma.address.findFirst({
    where: { id, userId },
  });

  if (!address) {
    return responseHandler.error(res, "Address not found", 404);
  }

  const addressCount = await prisma.address.count({ where: { userId, isActive: true } });
  if (addressCount === 1) {
    return responseHandler.error(
      res,
      "Cannot delete the only address. Please add another address first.",
      400,
    );
  }

  const deletedAddress = await prisma.address.update({
    where: { id },
    data: { isActive: false },
  });

  if (deletedAddress.isPrimary) {
    const nextAddress = await prisma.address.findFirst({
      where: { userId, isActive: true, id: { not: id } },
      orderBy: { createdAt: "asc" },
    });

    if (nextAddress) {
      await prisma.address.update({
        where: { id: nextAddress.id },
        data: { isPrimary: true },
      });
    }
  }

  auditLogger.info("Address deleted", {
    userId,
    addressId: id,
  });

  return responseHandler.success(res, {}, "Address deleted successfully");
});

export const setPrimaryAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const address = await prisma.address.findFirst({
    where: { id, userId },
  });

  if (!address) {
    return responseHandler.error(res, "Address not found", 404);
  }

  if (!address.isActive) {
    return responseHandler.error(res, "Cannot set inactive address as primary", 400);
  }

  await prisma.address.updateMany({
    where: { userId, isPrimary: true, id: { not: id } },
    data: { isPrimary: false },
  });

  const updatedAddress = await prisma.address.update({
    where: { id },
    data: { isPrimary: true },
  });

  auditLogger.info("Primary address updated", {
    userId,
    addressId: id,
  });

  return responseHandler.success(
    res,
    { address: updatedAddress },
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
