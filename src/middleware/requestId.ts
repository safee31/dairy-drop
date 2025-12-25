import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { requestContext } from "@/utils/logger";

/**
 * Middleware: Generate or use existing X-Request-Id header
 * Store in AsyncLocalStorage for request-scoped context
 * No extra packages needed (crypto & AsyncLocalStorage are built-in)
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Use existing X-Request-Id or generate new UUID
  const requestId =
    (typeof req.headers["x-request-id"] === "string"
      ? req.headers["x-request-id"]
      : null) || randomUUID();

  // Store in AsyncLocalStorage for automatic injection in logs
  requestContext.run({ requestId }, () => {
    // Add to response header so client can trace requests
    res.setHeader("X-Request-Id", requestId);
    // Add to Express locals for manual access if needed
    res.locals.requestId = requestId;
    next();
  });
};
