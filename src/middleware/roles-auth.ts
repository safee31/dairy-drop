import { Request, Response, NextFunction } from "express";
import { AuthErrors } from "@/utils/customError";
import { responseHandler } from "@/middleware/responseHandler";

/**
 * Role-based access control middleware.
 * Accepts a single role type or array of role types (numbers).
 * Must be used after validateLoginSession (requires req.user to be set).
 */
export const requireRole = (allowedTypes: number | number[]) => {
  const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];

  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;

    if (!user || !user.role) {
      return responseHandler.forbidden(res, AuthErrors.INSUFFICIENT_PERMISSIONS);
    }

    if (!types.includes(user.role.type)) {
      return responseHandler.forbidden(res, AuthErrors.INSUFFICIENT_PERMISSIONS);
    }

    next();
  };
};

export const requireAdmin = requireRole(1);
export const requireCustomer = requireRole(2);

export default {
  requireRole,
  requireAdmin,
  requireCustomer,
};
