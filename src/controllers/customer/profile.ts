import asyncHandler from "@/utils/asyncHandler";
import { auditLogger } from "@/utils/logger";
import { responseHandler } from "@/middleware/responseHandler";
import { AuthErrors } from "@/utils/customError";
import { UserRepo } from "@/models/repositories";

const updateProfile = asyncHandler(async (req, res) => {
  const sessionUser = (req.user as any);
  const { fullName, phoneNumber, dateOfBirth, userId } = req.body;

  const isAdmin = sessionUser.role?.type === 1;

  if (isAdmin && !userId) {
    return responseHandler.error(res, "Please specify which customer profile to update", 400);
  }

  if (!isAdmin && userId) {
    return responseHandler.forbidden(res, "You can only update your own profile");
  }

  const targetUserId = userId || sessionUser.userId;

  const user = await UserRepo.findOne({ where: { id: targetUserId, isActive: true }, relations: ["role"] });

  if (!user) {
    return responseHandler.unauthorized(res, AuthErrors.USER_NOT_FOUND);
  }

  if (fullName) user.fullName = fullName;
  if (phoneNumber !== undefined) user.phoneNumber = phoneNumber || null;
  if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

  await UserRepo.save(user);

  auditLogger.info("Profile updated", {
    updatedUserId: user.id,
    updatedByUserId: sessionUser.userId,
    email: user.email,
    isAdminUpdate: userId ? true : false,
  });

  return responseHandler.success(
    res,
    {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        isActive: user.isActive,
        role: user.role,
      },
    },
    "Profile updated successfully!",
  );
});

const uploadProfileImage = asyncHandler(async (req, res) => {
  const sessionUser = (req.user as any);
  const { userId } = req.body || req.query;

  if (!req.file) {
    return responseHandler.error(res, "Please select an image to upload", 400);
  }

  const isAdmin = sessionUser.role?.type === 1;

  if (isAdmin && !userId) {
    return responseHandler.error(res, "Please specify which customer\'s image to upload", 400);
  }

  if (!isAdmin && userId) {
    return responseHandler.forbidden(res, "You can only upload your own profile image");
  }

  const targetUserId = userId || sessionUser.userId;

  const user = await UserRepo.findOne({ where: { id: targetUserId, isActive: true } });

  if (!user) {
    return responseHandler.unauthorized(res, AuthErrors.USER_NOT_FOUND);
  }

  const { updateImage } = await import("@/utils/image");

  user.profileImage = await updateImage(req.file, user.profileImage, "profiles");

  await UserRepo.save(user);

  auditLogger.info("Profile image uploaded", {
    updatedUserId: user.id,
    updatedByUserId: sessionUser.userId,
    email: user.email,
    isAdminUpdate: userId ? true : false,
  });

  return responseHandler.success(
    res,
    {
      user: {
        id: user.id,
        profileImage: user.profileImage,
      },
    },
    "Profile image uploaded successfully!",
    201,
  );
});

const deleteProfileImage = asyncHandler(async (req, res) => {
  const sessionUser = (req.user as any);
  const { userId } = req.body || req.query;

  const isAdmin = sessionUser.role?.type === 1;

  if (isAdmin && !userId) {
    return responseHandler.error(res, "Please specify which customer\'s image to delete", 400);
  }

  if (!isAdmin && userId) {
    return responseHandler.forbidden(res, "You can only delete your own profile image");
  }

  const targetUserId = userId || sessionUser.userId;

  const user = await UserRepo.findOne({ where: { id: targetUserId, isActive: true } });

  if (!user) {
    return responseHandler.unauthorized(res, AuthErrors.USER_NOT_FOUND);
  }

  if (!user.profileImage) {
    return responseHandler.error(res, "No profile image to delete", 400);
  }

  const { deleteImage } = await import("@/utils/image");

  await deleteImage(user.profileImage);
  user.profileImage = null;

  await UserRepo.save(user);

  auditLogger.info("Profile image deleted", {
    updatedUserId: user.id,
    updatedByUserId: sessionUser.userId,
    email: user.email,
    isAdminUpdate: userId ? true : false,
  });

  return responseHandler.success(
    res,
    { profileImage: null },
    "Profile image deleted successfully!",
  );
});

export default {
  updateProfile,
  uploadProfileImage,
  deleteProfileImage,
};
