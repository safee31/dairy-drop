import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { auditLogger } from "@/utils/logger";
import { UserRepo, RoleRepo } from "@/models/repositories";
import { normalizeEmail } from "@/utils/helpers";
import { saveImage, updateImage, deleteImage } from "@/utils/image";
import { authUtils } from "@/models/user/utils";
import config from "@/config/env";

export const getAllCustomers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    isActive,
    isVerified,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const queryBuilder = UserRepo.createQueryBuilder("user")
    .leftJoinAndSelect("user.role", "role")
    .where("role.type = :type", { type: 2 });

  if (search) {
    queryBuilder.andWhere(
      "(user.fullName ILIKE :search OR user.email ILIKE :search)",
      { search: `%${search}%` },
    );
  }

  if (isActive !== undefined) {
    queryBuilder.andWhere("user.isActive = :isActive", {
      isActive: isActive === "true",
    });
  }

  if (isVerified !== undefined) {
    queryBuilder.andWhere("user.isVerified = :isVerified", {
      isVerified: isVerified === "true",
    });
  }

  const total = await queryBuilder.getCount();

  const customers = await queryBuilder
    .orderBy(`user.${String(sortBy)}`, String(sortOrder).toUpperCase() as "ASC" | "DESC")
    .skip(skip)
    .take(Number(limit))
    .getMany();

  const customersData = customers.map((customer) => ({
    id: customer.id,
    email: customer.email,
    fullName: customer.fullName,
    phoneNumber: customer.phoneNumber,
    profileImage: customer.profileImage,
    isActive: customer.isActive,
    isVerified: customer.isVerified,
    lastLoginAt: customer.lastLoginAt,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }));

  return responseHandler.success(
    res,
    {
      customers: customersData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
    "Customers retrieved successfully",
  );
});

export const getCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const customer = await UserRepo.findOne({
    where: { id },
    relations: ["role"],
  });

  if (!customer) {
    return responseHandler.error(res, "Customer not found", 404);
  }

  if (customer.role?.type !== 2) {
    return responseHandler.error(res, "User is not a customer", 400);
  }

  return responseHandler.success(
    res,
    {
      customer: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        profileImage: customer.profileImage,
        isActive: customer.isActive,
        isVerified: customer.isVerified,
        lastLoginAt: customer.lastLoginAt,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
    },
    "Customer retrieved successfully",
  );
});

export const createCustomer = asyncHandler(async (req, res) => {
  const { email, password, fullName, phoneNumber } = req.body;

  const existingUser = await UserRepo.findOneBy({ email: normalizeEmail(email) });

  if (existingUser) {
    return responseHandler.error(res, "User with this email already exists", 400);
  }

  let profileImage = null;
  if (req.file) {
    profileImage = await saveImage(req.file, "profiles");
  }

  const hashedPassword = await authUtils.hashPassword(
    password,
    config.BCRYPT_SALT_ROUNDS,
  );

  const customerRole = await RoleRepo.findOneBy({ type: 2 });

  if (!customerRole) {
    return responseHandler.error(res, "Customer role not found", 500);
  }

  const newCustomer = UserRepo.create({
    id: Math.random().toString(36).substring(2, 15),
    email: normalizeEmail(email),
    password: hashedPassword,
    fullName,
    phoneNumber: phoneNumber || null,
    profileImage,
    roleId: customerRole.id,
    isVerified: true,
    isActive: true,
  });

  const customer = await UserRepo.save(newCustomer);

  auditLogger.info("Admin created customer", {
    adminId: (req.user as { id: string })?.id,
    customerId: customer.id,
    email: customer.email,
  });

  return responseHandler.success(
    res,
    {
      customer: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        profileImage: customer.profileImage,
        isActive: customer.isActive,
        isVerified: customer.isVerified,
      },
    },
    "Customer created successfully",
    201,
  );
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, phoneNumber, password, isActive } = req.body;

  const customer = await UserRepo.findOne({
    where: { id },
    relations: ["role"],
  });

  if (!customer) {
    return responseHandler.error(res, "Customer not found", 404);
  }

  if (customer.role?.type !== 2) {
    return responseHandler.error(res, "User is not a customer", 400);
  }

  if (fullName) customer.fullName = fullName;
  if (phoneNumber !== undefined) customer.phoneNumber = phoneNumber || null;
  if (isActive !== undefined) customer.isActive = isActive === true || isActive === "true";

  if (password) {
    customer.password = await authUtils.hashPassword(
      password,
      config.BCRYPT_SALT_ROUNDS,
    );
  }

  if (req.file) {
    customer.profileImage = await updateImage(req.file, customer.profileImage, "profiles");
  }

  await UserRepo.save(customer);

  auditLogger.info("Admin updated customer", {
    adminId: (req.user as { id: string })?.id,
    customerId: customer.id,
  });

  return responseHandler.success(
    res,
    {
      customer: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        profileImage: customer.profileImage,
        isActive: customer.isActive,
        isVerified: customer.isVerified,
      },
    },
    "Customer updated successfully",
  );
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const customer = await UserRepo.findOne({
    where: { id },
    relations: ["role"],
  });

  if (!customer) {
    return responseHandler.error(res, "Customer not found", 404);
  }

  if (customer.role?.type !== 2) {
    return responseHandler.error(res, "User is not a customer", 400);
  }

  await deleteImage(customer.profileImage);

  await UserRepo.remove(customer);

  auditLogger.info("Admin deleted customer", {
    adminId: (req.user as { id: string })?.id,
    customerId: id,
  });

  return responseHandler.success(res, {}, "Customer deleted successfully");
});

export const toggleCustomerStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const customer = await UserRepo.findOne({
    where: { id },
    relations: ["role"],
  });

  if (!customer) {
    return responseHandler.error(res, "Customer not found", 404);
  }

  if (customer.role?.type !== 2) {
    return responseHandler.error(res, "User is not a customer", 400);
  }

  customer.isActive = !customer.isActive;
  await UserRepo.save(customer);

  auditLogger.info(`Admin ${customer.isActive ? "activated" : "deactivated"} customer`, {
    adminId: (req.user as { id: string })?.id,
    customerId: customer.id,
    status: customer.isActive,
  });

  return responseHandler.success(
    res,
    {
      customer: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        isActive: customer.isActive,
      },
    },
    `Customer ${customer.isActive ? "activated" : "deactivated"} successfully`,
  );
});

export default {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  toggleCustomerStatus,
};

