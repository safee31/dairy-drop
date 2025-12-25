import { Request, Response, NextFunction } from "express";
import { requestContext } from "@/utils/logger";

/**
 * Middleware: Inject request ID only (disabled request-level logging)
 * Only store requestId in context for audit/error logging
 * This prevents excessive log file growth from infinite user requests
 */
export const httpLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Store requestId in AsyncLocalStorage for use in error/audit logs
  const requestId = requestContext.getStore()?.requestId || "";
  if (requestId) {
    // RequestId already set by requestIdMiddleware, just continue
  }
  next();
};
