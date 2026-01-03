import asyncHandler from "@/utils/asyncHandler";
import { generateTokenPair, setCookie, clearCookie } from "@/utils/jwt";
import { generateResetToken, hashResetToken, parseExpiryToSeconds } from "@/utils/otp";
import { verifyRefreshToken, revokeRefreshToken } from "@/utils/jwt";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "@/utils/emailService";
import { logger, auditLogger } from "@/utils/logger";
import { responseHandler } from "@/middleware/responseHandler";
import config from "@/config/env";
import { setKey, getKey, delKey } from "@/utils/redis/redisClient";
import { authUtils, userSchemas } from "@/models/User";
import { UserRepo, RoleRepo } from "@/models/repositories";
import { generateOTP, storeOTP, verifyOTP } from "@/utils/redis";
import { normalizeEmail } from "@/utils/helpers";
import { validate } from "@/middleware/validate";

export const registerCustomer = asyncHandler(async (req, res) => {
  const { email, password, fullName, phoneNumber, profileImage } = req.body;

  const existingUser = await UserRepo.findOneBy({ email: normalizeEmail(email) });

  if (existingUser) {
    return responseHandler.error(res, "User already exists!", 400);
  }

  let customerRole = await RoleRepo.findOneBy({ name: "Customer", type: 2 });

  if (!customerRole) {
    customerRole = RoleRepo.create({
      id: Math.random().toString(36).substring(2, 15),
      name: "Customer",
      type: 2,
      description: "Default customer role",
      permissions: {},
    });
    await RoleRepo.save(customerRole);
  }

  const hashedPassword = await authUtils.hashPassword(
    password,
    config.BCRYPT_SALT_ROUNDS,
  );

  const newUser = UserRepo.create({
    id: Math.random().toString(36).substring(2, 15),
    email: normalizeEmail(email),
    fullName,
    password: hashedPassword,
    roleId: customerRole.id,
    isVerified: false,
    isActive: true,
    phoneNumber: phoneNumber || null,
    profileImage: profileImage || null,
  });

  const user = await UserRepo.save(newUser);

  if (!config.ALLOW_UNVERIFIED_LOGIN) {
    const verificationOTP = generateOTP();
    await storeOTP(normalizeEmail(email), verificationOTP, "verify");

    try {
      await sendVerificationEmail(email, verificationOTP, fullName);
    } catch (emailError) {
      logger.error("Failed to send verification email", {
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }
  }

  auditLogger.info("User registered", {
    userId: user.id,
    email: user.email,
    ip: req.ip,
  });

  return responseHandler.success(
    res,
    {},
    "Customer registered successfully!",
    201,
  );
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await UserRepo.findOneBy({ email: normalizeEmail(email) });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  if (user.isVerified) {
    return responseHandler.error(res, "User is already verified!", 404);
  }

  // Verify OTP from Redis
  const isValidOTP = await verifyOTP(normalizeEmail(email), otp, "verify");
  if (!isValidOTP) {
    return responseHandler.error(res, "Invalid or expired OTP", 400);
  }

  user.isVerified = true;
  await UserRepo.save(user);

  // Log email verification (safe: userId + email only)
  auditLogger.info("Email verified", {
    userId: user.id,
    ip: req.ip,
  });

  // Send welcome email
  try {
    await sendWelcomeEmail(email, user.fullName);
    logger.info("Welcome email sent");
  } catch (emailError) {
    logger.error("Failed to send welcome email", {
      error: emailError instanceof Error ? emailError.message : String(emailError),
    });
  }

  return responseHandler.success(res, {}, "Email verified successfully!");
});

export const loginCustomer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await UserRepo.findOne({
    where: { email: normalizeEmail(email) },
    relations: ["role"],
  });

  if (!user || !(await authUtils.comparePassword(password, user.password))) {
    return responseHandler.unauthorized(res, "Incorrect email or password!");
  }

  if (!config.ALLOW_UNVERIFIED_LOGIN && !user.isVerified) {
    return responseHandler.error(
      res,
      "Your email is not verified. Please check your email for verification link.",
      400,
    );
  }

  if (!user.isActive) {
    return responseHandler.error(
      res,
      "Your account is inactive. Please contact support for assistance.",
      400,
    );
  }

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    roleId: user.roleId || "",
  };

  const { accessToken, refreshToken } = await generateTokenPair(tokenPayload);

  setCookie(res, "tpa_session", accessToken);
  const refreshTtlMs = (parseExpiryToSeconds(config.JWT_REFRESH_EXPIRES_IN) || 300) * 1000;
  setCookie(res, "tpa_refresh", refreshToken, { maxAge: refreshTtlMs });

  user.lastLoginAt = new Date();
  await UserRepo.save(user);

  // Log successful login (only userId, email, IP - no User-Agent)
  auditLogger.info("Login successful", {
    userId: user.id,
    ip: req.ip,
  });

  return responseHandler.success(
    res,
    {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        role: user.role,
      },
    },
    "Login successful!",
  );
});

/**
 * Refresh tokens (rotate): accepts `tpa_refresh` cookie, validates it, issues new tokens
 */
export const refreshTokens = asyncHandler(async (req, res) => {
  const oldRefresh = req.cookies?.tpa_refresh;
  if (!oldRefresh) return responseHandler.unauthorized(res, "Refresh token required");

  // Validate old refresh token
  const decoded = await verifyRefreshToken(oldRefresh).catch(() => null);
  if (!decoded) return responseHandler.unauthorized(res, "Invalid refresh token");

  // Revoke old refresh token (delete from Redis)
  await revokeRefreshToken(oldRefresh).catch(() => { });

  // Issue new token pair
  const payload = { 
    userId: decoded.userId, 
    email: decoded.email, 
    roleId: decoded.roleId 
  };
  const { accessToken, refreshToken } = await generateTokenPair(payload);

  // Set cookies
  setCookie(res, "tpa_session", accessToken);
  const refreshTtlMs = (parseExpiryToSeconds(config.JWT_REFRESH_EXPIRES_IN) || 300) * 1000;
  setCookie(res, "tpa_refresh", refreshToken, { maxAge: refreshTtlMs });

  return responseHandler.success(res, { accessToken }, "Tokens refreshed");
});

/**
 * Forgot password - send OTP
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email?.trim()) {
    return responseHandler.error(res, "Email is required", 400);
  }

  const user = await UserRepo.findOneBy({ email: normalizeEmail(email) });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  const e = normalizeEmail(email);

  // Invalidate any existing reset sessions for this email so resend works
  try {
    const existing = await getKey(`reset_by_email:${e}`);
    if (existing) {
      await delKey(`reset:${e}:${existing}`, `reset_by_email:${e}`).catch(() => { });
    }
  } catch (err) {
    logger.error("Failed to clear existing reset session", { error: err instanceof Error ? err.message : String(err) });
  }

  // Generate OTP and store in Redis (not DB)
  const resetOTP = generateOTP();
  await storeOTP(e, resetOTP, "reset");

  // Send OTP via email
  await sendPasswordResetEmail(email, resetOTP, user.fullName);

  // Clear any existing session cookies
  clearCookie(res, "tpa_session");
  clearCookie(res, "tpa_refresh");
  clearCookie(res, "resetSession");

  return responseHandler.success(
    res,
    {},
    "OTP sent to email for password reset.",
  );
});

/**
 * Reset password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email = "", otp = "", newPassword = "" } = req.body;

  const resetSession = req?.cookies?.resetSession;
  if (!resetSession) {
    return responseHandler.error(res, "Invalid reset session", 400);
  }

  if (!email?.trim()) {
    return responseHandler.error(res, "Email is required", 400);
  }

  if (!newPassword?.trim()) {
    return responseHandler.error(res, "New password is required", 400);
  }

  if (!otp?.trim()) {
    return responseHandler.error(res, "OTP is required", 400);
  }

  const user = await UserRepo.findOneBy({ email: normalizeEmail(email) });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  const hashedResetToken = hashResetToken(resetSession);
  const e = normalizeEmail(user.email);
  const stored = await getKey(`reset:${e}:${hashedResetToken}`);
  if (!stored) {
    return responseHandler.error(res, "Invalid or expired reset session", 400);
  }

  const hashedPassword = await authUtils.hashPassword(
    newPassword,
    config.BCRYPT_SALT_ROUNDS,
  );

  user.password = hashedPassword;
  await UserRepo.save(user);

  // Remove reset session from Redis
  await delKey(`reset:${e}:${hashedResetToken}`, `reset_by_email:${e}`).catch(() => { });

  // Clear cookies
  clearCookie(res, "resetSession");
  clearCookie(res, "tpa_session");
  clearCookie(res, "tpa_refresh");

  // Log password reset
  auditLogger.info("Password reset successful", {
    userId: user.id,
    email: user.email,
    ip: req.ip,
  });

  return responseHandler.success(res, {}, "Password reset successfully!");
});

/**
 * Read user profile
 */
export const readUser = asyncHandler(async (req, res) => {
  // Ensure user is authenticated
  const user = req?.user;

  // Return the user data
  return responseHandler.success(
    res,
    {
      user: {
        id: user?.id,
        email: user?.email,
        fullName: user?.fullName,
        phoneNumber: user?.phoneNumber,
        profileImage: user?.profileImage,
        isVerified: user?.isVerified,
        isActive: user?.isActive,
        lastLoginAt: user?.lastLoginAt,
        role: user?.role,
        addresses: user?.addresses || [],
        createdAt: user?.createdAt,
      },
    },
    "User authenticated successfully!",
  );
});

// Profile update endpoint removed for now; storage utilities remain available for future use.

/**
 * Logout (following your exact pattern)
 */
export const logout = asyncHandler(async (req, res) => {
  // Clear the authentication and reset session cookies
  clearCookie(res, "resetSession");
  clearCookie(res, "tpa_session");
  clearCookie(res, "tpa_refresh");

  // Log logout
  auditLogger.info("User logout", {
    userId: req.user?.id,
    email: req.user?.email,
    ip: req.ip,
  });

  return responseHandler.success(res, {}, "Logged out successfully!");
});

/**
 * Verify user OTP
 */
export const verifyUserOTP = asyncHandler(async (req, res) => {
  const { email, otp, otpType } = req.body;

  if (!email || !otp || !otpType) {
    return responseHandler.error(
      res,
      "Email, OTP, and OTP type are required!",
      400,
    );
  }

  const user = await UserRepo.findOneBy({ email: normalizeEmail(email) });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  if (!["verify", "reset"].includes(otpType)) {
    return responseHandler.error(res, "Invalid OTP type!", 400);
  }

  // Verify OTP from Redis
  const isValidOTP = await verifyOTP(normalizeEmail(email), otp, otpType);
  if (!isValidOTP) {
    return responseHandler.error(res, "Invalid or expired OTP!", 400);
  }

  if (otpType === "verify") {
    user.isVerified = true;
    await UserRepo.save(user);
  } else if (otpType === "reset") {
    const resetSession = generateResetToken();
    const hashed = hashResetToken(resetSession);
    const e = normalizeEmail(user.email);
    await setKey(`reset:${e}:${hashed}`, "1", config.RESET_TOKEN_EXPIRY_MINUTES * 60);
    await setKey(`reset_by_email:${e}`, hashed, config.RESET_TOKEN_EXPIRY_MINUTES * 60);
    setCookie(res, "resetSession", resetSession, {
      maxAge: config.RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    });
  }

  return responseHandler.success(res, {}, "OTP verified successfully!");
});

/**
 * Send user OTP
 */
export const sendUserOTP = asyncHandler(async (req, res) => {
  const { email, otpType } = req.body;

  if (!email || !otpType) {
    return responseHandler.error(res, "Email and OTP type are required!", 400);
  }

  if (!["verify", "reset"].includes(otpType)) {
    return responseHandler.error(res, "Invalid OTP type!", 400);
  }

  const user = await UserRepo.findOneBy({ email: normalizeEmail(email) });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  // Generate OTP and store in Redis
  const otp = generateOTP();
  const e = normalizeEmail(email);

  // If there is an existing reset token index for this email, invalidate it
  if (otpType === "reset") {
    try {
      const existing = await getKey(`reset_by_email:${e}`);
      if (existing) {
        await delKey(`reset:${e}:${existing}`, `reset_by_email:${e}`).catch(() => { });
      }
    } catch (err) {
      logger.error("Failed to clear existing reset session before sending OTP", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  await storeOTP(e, otp, otpType);

  if (otpType === "verify") {
    await sendVerificationEmail(email, otp, user.fullName);
  } else if (otpType === "reset") {
    await sendPasswordResetEmail(email, otp, user.fullName);

    // Don't create reset session here — session is created only after OTP verification.
    // Clear session cookies to prevent accidental reuse of existing auth.
    clearCookie(res, "tpa_session");
    clearCookie(res, "tpa_refresh");
  }

  return responseHandler.success(res, {}, "OTP sent to email.");
});

export default {
  registerCustomer,
  verifyEmail,
  loginCustomer,
  forgotPassword,
  resetPassword,
  readUser,
  logout,
  verifyUserOTP,
  sendUserOTP,
  refreshTokens,
};
