import asyncHandler from "@/utils/asyncHandler";
import { generateTokenPair, setCookie, clearCookie } from "@/utils/jwt";
import { generateResetToken, hashResetToken } from "@/utils/otp";
import { verifyRefreshToken, revokeRefreshToken } from "@/utils/jwt";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "@/utils/emailService";
import { logger, auditLogger, requestContext } from "@/utils/logger";
import { responseHandler } from "@/middleware/responseHandler";
import config from "@/config/env";
import { setKey, getKey, delKey } from "@/utils/redis/redisClient";
import { authUtils } from "@/models/User";
import { prisma }  from "@/config/database";
import fileStorage from "@/services/fileStorage";
import { extractFolderAndFilename } from "@/utils/file";
import { generateOTP, storeOTP, verifyOTP, isAccountLockedByFailedLogins, trackFailedLogin, resetFailedLoginAttempts } from "@/utils/redis";

const parseExpiryToSeconds = (val?: string): number => {
  if (!val) return 300;
  const match = /^([0-9]+)([smhd])?$/.exec(val.trim());
  if (!match) return 300;
  const n = parseInt(match[1], 10);
  const unit = match[2] || "s";
  switch (unit) {
    case "d":
      return n * 24 * 60 * 60;
    case "h":
      return n * 60 * 60;
    case "m":
      return n * 60;
    case "s":
    default:
      return n;
  }
};

/**
 * Register new customer
 */
export const registerCustomer = asyncHandler(async (req, res) => {
  const { email, password, fullName, phoneNumber, profileImage } = req.body;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    return responseHandler.error(res, "User already exists!", 400);
  }

  // Get or create default Customer role
  let customerRole = await prisma.role.findFirst({
    where: { name: "Customer", type: 2 },
  });

  if (!customerRole) {
    customerRole = await prisma.role.create({
      data: { name: "Customer", type: 2, description: "Default customer role" },
    });
  }

  // Hash password using auth utils
  const hashedPassword = await authUtils.hashPassword(
    password,
    config.BCRYPT_SALT_ROUNDS,
  );

  // Create user data object (OTP stored in Redis, not DB)
  const userData: Record<string, unknown> = {
    email: email.toLowerCase(),
    fullName,
    password: hashedPassword,
    roleId: customerRole.id,
    isVerified: false,
    isActive: true,
  };

  // Only add optional fields if they are provided
  if (phoneNumber) userData.phoneNumber = phoneNumber;
  if (profileImage) userData.profileImage = profileImage;

  // Create user
  const user = await prisma.user.create({
    data: userData as any,
    include: {
      role: true,
    },
  });

  // Generate OTP and store in Redis
  // Generate OTP and send verification only when verification is required.
  if (!config.ALLOW_UNVERIFIED_LOGIN) {
    const verificationOTP = generateOTP();
    await storeOTP(email.toLowerCase(), verificationOTP, "verify");

    try {
      await sendVerificationEmail(email, verificationOTP, fullName);
    } catch (emailError) {
      logger.error("Failed to send verification email", {
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }
  }

  // Log registration (only email, no paths or sensitive data)
  const requestId = requestContext.getStore()?.requestId || "";
  auditLogger.info("User registered", {
    requestId,
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

/**
 * Verify email with OTP
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  if (user.isVerified) {
    return responseHandler.error(res, "User is already verified!", 404);
  }

  // Verify OTP from Redis
  const isValidOTP = await verifyOTP(email.toLowerCase(), otp, "verify");
  if (!isValidOTP) {
    return responseHandler.error(res, "Invalid or expired OTP", 400);
  }

  // Update user as verified
  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
    },
  });

  // Log email verification (safe: userId + email only)
  const verifyRequestId = requestContext.getStore()?.requestId || "";
  auditLogger.info("Email verified", {
    requestId: verifyRequestId,
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

/**
 * Login customer
 */
export const loginCustomer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for account lockout due to failed login attempts
  const isLocked = await isAccountLockedByFailedLogins(email.toLowerCase());
  if (isLocked) {
    return responseHandler.error(
      res,
      "Account temporarily locked due to too many failed login attempts. Please try again later.",
      429,
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      role: true,
    },
  });

  if (!user || !(await authUtils.comparePassword(password, user.password))) {
    // Track failed login attempt
    await trackFailedLogin(email.toLowerCase());
    return responseHandler.unauthorized(res, "Incorrect email or password!");
  }

  // Reset failed login attempts on successful login
  await resetFailedLoginAttempts(email.toLowerCase());

  // Ensure user is verified
  // If the application requires verification before login, enforce it.
  if (!config.ALLOW_UNVERIFIED_LOGIN && !user.isVerified) {
    return responseHandler.error(
      res,
      "Your email is not verified. Please check your email for verification link.",
      400,
    );
  }

  // Check if user is active
  if (!user.isActive) {
    return responseHandler.error(
      res,
      "Your account is inactive. Please contact support for assistance.",
      400,
    );
  }

  // Generate JWT token
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    roleId: user.roleId || "",
  };

  const { accessToken, refreshToken } = await generateTokenPair(tokenPayload);

  // Set cookies with correct names
  setCookie(res, "tpa_session", accessToken);
  const refreshTtlMs = (parseExpiryToSeconds(config.JWT_REFRESH_EXPIRES_IN) || 300) * 1000;
  setCookie(res, "tpa_refresh", refreshToken, { maxAge: refreshTtlMs });

  // Update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Log successful login (only userId, email, IP - no User-Agent)
  const loginRequestId = requestContext.getStore()?.requestId || "";
  auditLogger.info("Login successful", {
    requestId: loginRequestId,
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
  await revokeRefreshToken(oldRefresh).catch(() => {});

  // Issue new token pair
  const payload = { userId: decoded.userId, email: decoded.email, roleId: decoded.roleId } as any;
  const { accessToken, refreshToken } = await generateTokenPair(payload);

  // Set cookies
  setCookie(res, "tpa_session", accessToken);
  const refreshTtlMs = (parseExpiryToSeconds(config.JWT_REFRESH_EXPIRES_IN) || 300) * 1000;
  setCookie(res, "tpa_refresh", refreshToken, { maxAge: refreshTtlMs });

  return responseHandler.success(res, { accessToken }, "Tokens refreshed");
});

/**
 * Forgot password - send OTP (following your exact pattern)
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email?.trim()) {
    return responseHandler.error(res, "Email is required", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  const e = email.toLowerCase();

  // Invalidate any existing reset sessions for this email so resend works
  try {
    const existing = await getKey(`reset_by_email:${e}`);
    if (existing) {
      await delKey(`reset:${e}:${existing}`, `reset_by_email:${e}`).catch(() => {});
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
 * Reset password (following your exact pattern)
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email = "", otp = "", newPassword = "" } = req.body;

  // Validate reset session (check if reset session cookie exists and is valid)
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

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  // Verify reset session
  const hashedResetToken = hashResetToken(resetSession);
  // Verify reset session exists in Redis. Redis values are strings,
  // so compare against `String(user.id)` to avoid type mismatch.
  const e = user.email.toLowerCase();
  const stored = await getKey(`reset:${e}:${hashedResetToken}`);
  if (!stored) {
    return responseHandler.error(res, "Invalid or expired reset session", 400);
  }

  // NOTE: OTP was already verified in the OTP verification step which
  // created the `resetSession`. Rely on the `resetSession` stored in Redis
  // instead of re-checking the OTP (which is deleted on successful verification).

  // Hash new password using auth utils
  const hashedPassword = await authUtils.hashPassword(
    newPassword,
    config.BCRYPT_SALT_ROUNDS,
  );

  // Update the password after OTP verification
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
    },
  });

  // Remove reset session from Redis
  // Remove both the specific reset token and the index for this email
  await delKey(`reset:${e}:${hashedResetToken}`, `reset_by_email:${e}`).catch(() => {});

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
 * Verify user OTP (following your exact pattern with otpType)
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

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  if (!["verify", "reset"].includes(otpType)) {
    return responseHandler.error(res, "Invalid OTP type!", 400);
  }

  // Verify OTP from Redis
  const isValidOTP = await verifyOTP(email.toLowerCase(), otp, otpType);
  if (!isValidOTP) {
    return responseHandler.error(res, "Invalid or expired OTP!", 400);
  }

  // Only clear OTP data for email verification, not for password reset
  if (otpType === "verify") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
      },
    });
  } else if (otpType === "reset") {
    // For reset type: OTP is valid, now generate reset session and set cookie
    const resetSession = generateResetToken();
    const hashed = hashResetToken(resetSession);
    // Store hashed reset session in Redis with TTL under an email-scoped key
    // Use lowercased email to ensure consistency across requests.
    const e = user.email.toLowerCase();
    await setKey(`reset:${e}:${hashed}`, "1", config.RESET_TOKEN_EXPIRY_MINUTES * 60);
    // Also store an index so we can invalidate previous tokens and support resends
    await setKey(`reset_by_email:${e}`, hashed, config.RESET_TOKEN_EXPIRY_MINUTES * 60);

    // Set reset session cookie after OTP verification
    setCookie(res, "resetSession", resetSession, {
      maxAge: config.RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    });
  }

  return responseHandler.success(res, {}, "OTP verified successfully!");
});

/**
 * Send user OTP (following your exact pattern with otpType)
 */
export const sendUserOTP = asyncHandler(async (req, res) => {
  const { email, otpType } = req.body;

  if (!email || !otpType) {
    return responseHandler.error(res, "Email and OTP type are required!", 400);
  }

  if (!["verify", "reset"].includes(otpType)) {
    return responseHandler.error(res, "Invalid OTP type!", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  // Generate OTP and store in Redis
  const otp = generateOTP();
  const e = email.toLowerCase();

  // If there is an existing reset token index for this email, invalidate it
  if (otpType === "reset") {
    try {
      const existing = await getKey(`reset_by_email:${e}`);
      if (existing) {
        await delKey(`reset:${e}:${existing}`, `reset_by_email:${e}`).catch(() => {});
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
