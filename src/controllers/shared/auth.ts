import asyncHandler from "@/utils/asyncHandler";
import { loginSessionService } from "@/utils/redis/loginSession";
import { responseHandler } from "@/middleware/responseHandler";
import { AuthErrors } from "@/utils/customError";
import { setCookie } from "@/utils/jwt";
import config from "@/config/env";
import { authUtils } from "@/models/user/utils";
import { UserRepo } from "@/models/repositories";
import { normalizeEmail } from "@/utils/helpers";
import { csrfService } from "@/utils/security";
import { auditLogger } from "@/utils/logger";

/**
 * Creates a role-specific login handler.
 * The route prefix (/customer/auth or /admin/auth) determines which role is allowed.
 * @param allowedRoleType - 1 for admin, 2 for customer
 */
const createLoginHandler = (allowedRoleType: number) => {
  return asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const user = await UserRepo.findOne({
      where: { email: normalizedEmail, isActive: true },
      relations: ["role"],
    });

    if (!user || !(await authUtils.comparePassword(password, user.password))) {
      return responseHandler.unauthorized(res, AuthErrors.INVALID_CREDENTIALS);
    }

    // Enforce role type based on the route prefix
    if (user.role?.type !== allowedRoleType) {
      return responseHandler.forbidden(res, AuthErrors.INSUFFICIENT_PERMISSIONS);
    }

    if (!config.ALLOW_UNVERIFIED_LOGIN && !user.isVerified) {
      return responseHandler.forbidden(res, AuthErrors.EMAIL_NOT_VERIFIED);
    }

    if (!user.isActive) {
      return responseHandler.forbidden(res, AuthErrors.ACCOUNT_INACTIVE);
    }

    const ip = req.ip || "unknown";
    const userAgent = req.headers["user-agent"] || "";

    try {
      const session = await loginSessionService.login(
        normalizedEmail,
        user.id,
        ip,
        userAgent,
      );

      setCookie(res as any, "sessionId", session.sessionId, {
        maxAge: config.COOKIE_MAX_AGE,
      } as any);

      const csrfToken = await csrfService.generate(session.sessionId);
      res.setHeader("x-csrf-token", csrfToken);

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
      if (errorMsg.includes("Too many login attempts")) {
        return responseHandler.error(res, AuthErrors.RATE_LIMIT_EXCEEDED, 429);
      }
      return responseHandler.error(res, errorMsg, 500);
    }
  });
};

export default { createLoginHandler };
