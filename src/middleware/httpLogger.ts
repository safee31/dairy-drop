import { logger } from "@/utils/logger";
import { Request, Response, NextFunction } from "express";

/**
 * HTTP Logger Middleware - Minimal logging for scalability
 * 
 * Purpose: Only logs errors and critical events, not every request
 * This prevents log file bloat from high traffic (users making many requests)
 * 
 * What gets logged:
 * - Errors (via errorHandler middleware)
 * - Audit events (login, register, password reset - via auditLogger)
 * - TypeORM slow queries (>1s)
 * 
 * What does NOT get logged:
 * - Every HTTP request/response
 * - Step-by-step request processing
 * - Normal successful operations
 */
export const httpLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // RequestId is already set by requestIdMiddleware
  // We don't log requests here - only errors and audit events are logged
  // This keeps logging minimal, scalable, and easy to understand
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
};
