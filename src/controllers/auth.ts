import asyncHandler from "@/utils/asyncHandler";
import { loginSessionService } from "@/utils/redis/loginSession";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "@/utils/emailService";
import { logger, auditLogger } from "@/utils/logger";
import { responseHandler } from "@/middleware/responseHandler";
import { AuthErrors } from "@/utils/customError";
import { verifyRefreshToken, generateTokenPair, setCookie, clearCookie, revokeRefreshToken } from "@/utils/jwt";
import config from "@/config/env";
import { authUtils } from "@/models/user/utils";
import { UserRepo, RoleRepo } from "@/models/repositories";
import { generateOTP, storeOTP, verifyOTP } from "@/utils/redis";
import { normalizeEmail, generateId } from "@/utils/helpers";

export const registerCustomer = asyncHandler(async (req, res) => {
  const { email, password, fullName, phoneNumber, profileImage } = req.body;
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await UserRepo.findOneBy({ email: normalizedEmail });

  if (existingUser) {
    return responseHandler.error(res, AuthErrors.EMAIL_ALREADY_EXISTS, 400);
  }

  let customerRole = await RoleRepo.findOneBy({ name: "Customer", type: 2 });

  if (!customerRole) {
    customerRole = RoleRepo.create({
      id: generateId(),
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
    id: generateId(),
    email: normalizedEmail,
    fullName,
    password: hashedPassword,
    roleId: customerRole.id,
    isVerified: false,
    isActive: true,
    phoneNumber: phoneNumber || null,
    profileImage: profileImage || null,
  });

  const user = await UserRepo.save(newUser);

  // Send verification email
  if (!config.ALLOW_UNVERIFIED_LOGIN) {
    const verificationOTP = generateOTP();
    await storeOTP(normalizedEmail, verificationOTP, "verify");

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

  // If email verification is not required, automatically create session and log them in
  if (config.ALLOW_UNVERIFIED_LOGIN) {
    const ip = req.ip || "unknown";
    const userAgent = req.headers["user-agent"] || "";

    try {
      const session = await loginSessionService.login(normalizedEmail, user.id, ip, userAgent);

      // Set session cookie using helper
      setCookie(res as any, "sessionId", session.sessionId, {
        maxAge: config.COOKIE_MAX_AGE,
      } as any);

      return responseHandler.success(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            profileImage: user.profileImage,
            isVerified: user.isVerified,
            isActive: user.isActive,
            role: { id: customerRole.id, name: customerRole.name, type: customerRole.type },
          },
        },
        "Customer registered and logged in successfully!",
        201,
      );
    } catch (error) {
      logger.error("Failed to create session after registration", {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
      });
      // Return success for registration despite session failure
      return responseHandler.success(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            profileImage: user.profileImage,
            isVerified: user.isVerified,
            isActive: user.isActive,
            role: { id: customerRole.id, name: customerRole.name, type: customerRole.type },
          },
        },
        "Customer registered successfully! Please log in to start shopping.",
        201,
      );
    }
  }

  return responseHandler.success(
    res,
    {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        isActive: user.isActive,
        role: { id: customerRole.id, name: customerRole.name, type: customerRole.type },
      },
    },
    "Customer registered successfully! Please verify your email to log in.",
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
  const normalizedEmail = normalizeEmail(email);

  const user = await UserRepo.findOne({
    where: { email: normalizedEmail },
    relations: ["role"],
  });

  if (!user || !(await authUtils.comparePassword(password, user.password))) {
    return responseHandler.unauthorized(res, AuthErrors.INVALID_CREDENTIALS);
  }

  if (!config.ALLOW_UNVERIFIED_LOGIN && !user.isVerified) {
    return responseHandler.error(
      res,
      AuthErrors.EMAIL_NOT_VERIFIED,
      400,
    );
  }

  if (!user.isActive) {
    return responseHandler.error(
      res,
      AuthErrors.ACCOUNT_INACTIVE,
      400,
    );
  }

  const ip = req.ip || "unknown";
  const userAgent = req.headers["user-agent"] || "";

  try {
    // Create session in Redis
    const session = await loginSessionService.login(normalizedEmail, user.id, ip, userAgent);

    // Set session cookie using helper
    setCookie(res as any, "sessionId", session.sessionId, {
      maxAge: config.COOKIE_MAX_AGE,
    } as any);

    // Update last login
    user.lastLoginAt = new Date();
    await UserRepo.save(user);

    auditLogger.info("Login successful", {
      userId: user.id,
      email: user.email,
      ip: req.ip,
    });

    return responseHandler.success(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          profileImage: user.profileImage,
          isVerified: user.isVerified,
          isActive: user.isActive,
          role: user.role,
        },
      },
      "Login successful!",
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return responseHandler.error(res, errorMsg, 400);
  }
});

/**
 * Validate Session
 * Check if current session is valid (for SPA on page load)
 */
export const validateSession = asyncHandler(async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId as string | undefined;

    if (!sessionId) {
      return res.status(200).json({ valid: false });
    }

    const ip = (req.ip || "unknown") as string;
    const validation = await loginSessionService.validateSession(sessionId, ip);

    if (validation.isValid) {
      return res.json({
        valid: true,
        email: validation.email,
        id: validation.userId,
        userId: validation.userId,
        expiresAt: validation.session?.expiresAt,
      });
    } else {
      clearCookie(res, "sessionId");
      return res.json({ valid: false });
    }
  } catch (error) {
    return res.status(500).json({ error: "Validation failed" });
  }
});
// Validate session: returns { valid: boolean, ... }
export const refreshSession = asyncHandler(async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId as string | undefined;
    const ip = (req.ip || "unknown") as string;

    if (sessionId) {
      try {
        const refreshed = await loginSessionService.refreshSession(sessionId, ip);

        setCookie(res as any, "sessionId", sessionId, {
          maxAge: config.COOKIE_MAX_AGE,
        } as any);

        return responseHandler.success(res, { expiresAt: refreshed.expiresAt }, "Session refreshed");
      } catch (err) {
        try { clearCookie(res, "sessionId"); } catch {}
      }
    }

    const refreshToken = req.cookies?.dd_refresh as string | undefined;
    if (refreshToken) {
      try {
        const decoded = await verifyRefreshToken(refreshToken);
        const tokens = await generateTokenPair({ userId: decoded.userId, email: decoded.email, roleId: decoded.roleId });

        // Retire the old refresh token to prevent replay attacks
        await revokeRefreshToken(refreshToken);

        setCookie(res, "dd_session", tokens.accessToken);
        setCookie(res, "dd_refresh", tokens.refreshToken);
        return responseHandler.success(res, {}, "Tokens refreshed");
      } catch (err) {
        try { clearCookie(res, "dd_session"); clearCookie(res, "dd_refresh"); } catch {}
        return responseHandler.unauthorized(res, AuthErrors.INVALID_TOKEN);
      }
    }

    return responseHandler.unauthorized(res, AuthErrors.TOKEN_REQUIRED);
  } catch (error) {
    try { clearCookie(res, "sessionId"); } catch {}
    try { clearCookie(res, "dd_session"); clearCookie(res, "dd_refresh"); } catch {}
    return responseHandler.unauthorized(res, AuthErrors.INVALID_TOKEN);
  }
});


// Logout: revoke session and clear session cookie
export const logout = asyncHandler(async (req, res) => {
  try {
    const sessionId = req.cookies?.sessionId;
    const email = (req.user as any)?.email;

    if (sessionId && email) {
      await loginSessionService.logout(sessionId, email);
    }

    clearCookie(res, "sessionId");

    return responseHandler.success(res, {}, "Logged out successfully!");
  } catch (error) {
    clearCookie(res, "sessionId");
    return responseHandler.success(res, {}, "Logged out successfully!");
  }
});

// Forgot password: send OTP for reset
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!email?.trim()) {
    return responseHandler.error(res, "Email is required", 400);
  }

  const user = await UserRepo.findOneBy({ email: normalizedEmail });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  const resetOTP = generateOTP();
  await storeOTP(normalizedEmail, resetOTP, "reset");

  await sendPasswordResetEmail(email, resetOTP, user.fullName);

  clearCookie(res, "sessionId");

  auditLogger.info("Password reset requested", {
    userId: user.id,
    email: user.email,
    ip: req.ip,
  });

  return responseHandler.success(res, {}, "OTP sent to email for password reset.");
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!email?.trim()) {
    return responseHandler.error(res, "Email is required", 400);
  }

  if (!newPassword?.trim()) {
    return responseHandler.error(res, "New password is required", 400);
  }

  if (!otp?.trim()) {
    return responseHandler.error(res, "OTP is required", 400);
  }

  const user = await UserRepo.findOneBy({ email: normalizedEmail });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  const isValidOTP = await verifyOTP(normalizedEmail, otp, "reset");
  if (!isValidOTP) {
    return responseHandler.error(res, "Invalid or expired OTP", 400);
  }

  const hashedPassword = await authUtils.hashPassword(
    newPassword,
    config.BCRYPT_SALT_ROUNDS,
  );

  user.password = hashedPassword;
  await UserRepo.save(user);

  await loginSessionService.logoutAll(normalizedEmail);

  clearCookie(res, "sessionId");

  auditLogger.info("Password reset successful", {
    userId: user.id,
    email: user.email,
    ip: req.ip,
  });

  return responseHandler.success(res, {}, "Password reset successfully!");
});

// Read user profile
export const readUser = asyncHandler(async (req, res) => {
  const sessionUser = (req.user as any);

  if (!sessionUser || !sessionUser.userId) {
    return responseHandler.unauthorized(res, AuthErrors.TOKEN_REQUIRED);
  }

  const dbUser = await UserRepo.findOne({ where: { id: sessionUser.userId }, relations: ["role"] });

  if (!dbUser) {
    return responseHandler.unauthorized(res, AuthErrors.USER_NOT_FOUND);
  }

  return responseHandler.success(
    res,
    {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        profileImage: dbUser.profileImage,
        isVerified: dbUser.isVerified,
        isActive: dbUser.isActive,
        role: dbUser.role,
      },
    },
    "User authenticated successfully!",
  );
});

// Send OTP for verification or reset
export const sendOTP = asyncHandler(async (req, res) => {
  const { email, otpType } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!email || !otpType) {
    return responseHandler.error(res, "Email and OTP type are required!", 400);
  }

  if (!["verify", "reset"].includes(otpType)) {
    return responseHandler.error(res, "Invalid OTP type!", 400);
  }

  const user = await UserRepo.findOneBy({ email: normalizedEmail });

  if (!user) {
    return responseHandler.error(res, "User not found!", 404);
  }

  // Generate OTP and store in Redis
  const otp = generateOTP();
  await storeOTP(normalizedEmail, otp, otpType);

  if (otpType === "verify") {
    await sendVerificationEmail(email, otp, user.fullName);
    } else if (otpType === "reset") {
    await sendPasswordResetEmail(email, otp, user.fullName);
    clearCookie(res, "sessionId");
  }

  return responseHandler.success(res, {}, "OTP sent to email.");
});

export default {
  registerCustomer,
  verifyEmail,
  loginCustomer,
  validateSession,
  refreshSession,
  logout,
  readUser,
  forgotPassword,
  resetPassword,
  sendOTP,
};
