import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { auditLogger, logger } from "@/utils/logger";
import { UserRepo, RoleRepo } from "@/models/repositories";
import { normalizeEmail, generateId } from "@/utils/helpers";
import { saveImage, updateImage, } from "@/utils/image";
import { authUtils } from "@/models/user/utils";
import { sendNewCustomerCredentialsEmail } from "@/utils/emailService";
import config from "@/config/env";

const getAllCustomers = asyncHandler(async (req, res) => {
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

  return responseHandler.success(
    res,
    {
      customers,
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

const getCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const customer = await UserRepo.findOne({
    where: { id },
    relations: ["role"],
  });

  if (!customer) {
    return responseHandler.error(res, "Customer not found", 404);
  }

  if (customer.role?.type !== 2) {
    return responseHandler.notFound(res, "Customer not found");
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
        dateOfBirth: customer.dateOfBirth,
        createdAt: customer.createdAt,
        isVerified: customer.isVerified,
        isActive: customer.isActive,
        role: customer.role,
      },
    },
    "Customer retrieved successfully",
  );
});

const createCustomer = asyncHandler(async (req, res) => {
  const { email, password, fullName, phoneNumber } = req.body;

  const existingUser = await UserRepo.findOneBy({ email: normalizeEmail(email) });

  if (existingUser) {
    return responseHandler.error(res, "An account with this email already exists.", 409);
  }

  let profileImage = null;


  const hashedPassword = await authUtils.hashPassword(
    password,
    config.BCRYPT_SALT_ROUNDS,
  );

  const customerRole = await RoleRepo.findOneBy({ type: 2 });

  if (!customerRole) {
    return responseHandler.error(res, "Unable to create customer. Please try again later.", 500);
  }
  if (req.file) {
    profileImage = await saveImage(req.file, "profiles");
  }

  const newCustomer = UserRepo.create({
    id: generateId(),
    email: normalizeEmail(email),
    password: hashedPassword,
    fullName,
    phoneNumber: phoneNumber || "",
    profileImage,
    roleId: customerRole.id,
    isVerified: false,
    isActive: true,
  });

  const customer = await UserRepo.save(newCustomer);

  // Send credentials email to newly created customer
  try {
    sendNewCustomerCredentialsEmail(email, password, fullName);
  } catch (emailError) {
    logger.error("Failed to send customer credentials email", {
      error: emailError instanceof Error ? emailError.message : String(emailError),
    });
  }

  auditLogger.info("Admin created customer", {
    adminId: req.user?.userId,
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

const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, phoneNumber, isActive } = req.body;

  const customer = await UserRepo.findOne({
    where: { id },
    relations: ["role"],
  });

  if (!customer) {
    return responseHandler.error(res, "Customer not found", 404);
  }

  if (customer.role?.type !== 2) {
    return responseHandler.notFound(res, "Customer not found");
  }

  if (fullName) customer.fullName = fullName;
  if (phoneNumber !== undefined) customer.phoneNumber = phoneNumber || null;
  if (isActive !== undefined) customer.isActive = isActive === true || isActive === "true";


  await UserRepo.save(customer);

  auditLogger.info("Admin updated customer", {
    adminId: req.user?.userId,
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

const uploadCustomerImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return responseHandler.error(res, "Please select an image to upload", 400);
  }

  const customer = await UserRepo.findOne({ where: { id, isActive: true }, relations: ["role"] });

  if (!customer) {
    return responseHandler.error(res, "Customer not found", 404);
  }

  if (customer.role?.type !== 2) {
    return responseHandler.notFound(res, "Customer not found");
  }

  customer.profileImage = await updateImage(req.file, customer.profileImage, "profiles");

  await UserRepo.save(customer);

  auditLogger.info("Admin uploaded customer profile image", {
    adminId: req.user?.userId,
    customerId: customer.id,
  });

  return responseHandler.success(
    res,
    { customer: { id: customer.id, profileImage: customer.profileImage } },
    "Profile image uploaded successfully!",
    201,
  );
});

const deleteCustomerImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const customer = await UserRepo.findOne({ where: { id, isActive: true }, relations: ["role"] });

  if (!customer) {
    return responseHandler.error(res, "Customer not found", 404);
  }

  if (customer.role?.type !== 2) {
    return responseHandler.notFound(res, "Customer not found");
  }

  if (!customer.profileImage) {
    return responseHandler.error(res, "No profile image to delete", 400);
  }

  const { deleteImage } = await import("@/utils/image");

  await deleteImage(customer.profileImage);
  customer.profileImage = null;

  await UserRepo.save(customer);

  auditLogger.info("Admin deleted customer profile image", {
    adminId: req.user?.userId,
    customerId: customer.id,
  });

  return responseHandler.success(res, { profileImage: null }, "Profile image deleted successfully!");
});

const toggleCustomerStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const customer = await UserRepo.findOne({
    where: { id },
    relations: ["role"],
  });

  if (!customer) {
    return responseHandler.error(res, "Customer not found", 404);
  }

  if (customer.role?.type !== 2) {
    return responseHandler.notFound(res, "Customer not found");
  }

  customer.isActive = !customer.isActive;
  await UserRepo.save(customer);

  auditLogger.info(`Admin ${customer.isActive ? "activated" : "deactivated"} customer`, {
    adminId: req.user?.userId,
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
  uploadCustomerImage,
  deleteCustomerImage,
  toggleCustomerStatus,
};

