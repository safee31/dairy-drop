import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, extractToken, verifyRefreshToken } from "@/utils/jwt";
import { AppError } from "@/middleware/errorHandler";
import { auditLogger } from "@/utils/logger";
import { AuthErrors } from "@/utils/customError";

// Request user shape is declared in validateLoginSession middleware

// Authentication middleware: verify JWT and load user
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(new AppError(AuthErrors.TOKEN_REQUIRED, 401));
    }

    const { user } = await verifyAccessToken(token);

    if (!user) {
      return next(new AppError(AuthErrors.INVALID_TOKEN, 401));
    }

    if (!user.isVerified) {
      auditLogger.info("Auth: unverified email", { userId: user.id });
      return next(new AppError(AuthErrors.EMAIL_NOT_VERIFIED, 401));
    }

    if (!user.isActive) {
      auditLogger.warn("Auth: inactive account", { userId: user.id });
      return next(new AppError(AuthErrors.ACCOUNT_INACTIVE, 401));
    }

    req.user = user;

    next();
  } catch {
    return next(new AppError(AuthErrors.INVALID_TOKEN, 401));
  }
};

// Role-based access control
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user || !user.role) {
      return next(new AppError(AuthErrors.INSUFFICIENT_PERMISSIONS, 403));
    }

    const userRole = (user?.role as { type: number })?.type;

    if (!allowedRoles.includes(userRole.toString())) {
      return next(new AppError(AuthErrors.INSUFFICIENT_PERMISSIONS, 403));
    }

    next();
  };
};

export const requireAdmin = requireRole(["1"]);
export const requireCustomer = requireRole(["2"]);
// Optional authentication middleware
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

// Refresh token middleware
export const authenticateRefresh = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies?.dd_refresh;

    if (!refreshToken) {
      return next(new AppError(AuthErrors.TOKEN_REQUIRED, 401));
    }

    const decoded = await verifyRefreshToken(refreshToken);

    req.user = { userId: decoded.userId, email: "", sessionId: "" };
    next();
  } catch {
    return next(new AppError(AuthErrors.INVALID_TOKEN, 401));
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
