import { Request, Response, NextFunction } from "express";
import { AppError } from "@/middleware/errorHandler";
import { AuthErrors } from "@/utils/customError";


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


export default {
  requireRole,
  requireAdmin,
  requireCustomer,
};
