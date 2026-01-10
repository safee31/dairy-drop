import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, extractToken, verifyRefreshToken } from "@/utils/jwt";
import { customError, AuthErrors } from "@/utils/customError";
import { auditLogger } from "@/utils/logger";

// Extend Request interface to include user and account
declare global {
  namespace Express {
    interface Request {
      user?: Record<string, unknown>;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token and loads user data
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      auditLogger.warn("Auth: missing token", { ip: req.ip });
      return next(customError(AuthErrors.TOKEN_REQUIRED, 401));
    }

    const { user } = await verifyAccessToken(token);

    if (!user) {
      return next(customError(AuthErrors.USER_NOT_FOUND, 401));
    }

    if (!user.isVerified) {
      auditLogger.info("Auth: unverified email", { userId: user.id });
      return next(customError(AuthErrors.EMAIL_NOT_VERIFIED, 401));
    }

    if (!user.isActive) {
      auditLogger.warn("Auth: inactive account", { userId: user.id });
      return next(customError(AuthErrors.ACCOUNT_INACTIVE, 401));
    }

    req.user = user;

    next();
  } catch {
    auditLogger.warn("Auth: invalid token", { ip: req.ip });
    return next(customError(AuthErrors.INVALID_TOKEN, 401));
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return next(customError(AuthErrors.INSUFFICIENT_PERMISSIONS, 403));
    }

    const userRole = (req.user?.role as { type: number })?.type;

    if (!allowedRoles.includes(userRole.toString())) {
      return next(customError(AuthErrors.INSUFFICIENT_PERMISSIONS, 403));
    }

    next();
  };
};

/**
 * Specific role middleware functions
 */
export const requireAdmin = requireRole(["1"]);
export const requireCustomer = requireRole(["2"]);

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractToken(req);

    if (token) {
      const { user } = await verifyAccessToken(token);
      req.user = user;
    }

    next();
  } catch {
    // Continue without authentication
    next();
  }
};

/**
 * Refresh token middleware
 */
export const authenticateRefresh = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies?.dd_refresh;

    if (!refreshToken) {
      return next(customError(AuthErrors.TOKEN_REQUIRED, 401));
    }

    const decoded = await verifyRefreshToken(refreshToken);

    req.user = { id: decoded.userId };
    next();
  } catch {
    return next(customError(AuthErrors.INVALID_TOKEN, 401));
  }
};

export default {
  authenticate,
  requireRole,
  requireAdmin,
  requireCustomer,
  optionalAuth,
  authenticateRefresh,
};
