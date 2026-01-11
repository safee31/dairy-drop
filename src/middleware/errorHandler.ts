import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { QueryFailedError } from "typeorm";
import config from "@/config/env";

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response | void => {
  let error = { ...err };
  error.message = err.message;

  logger.error("API Error", {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  if (err instanceof QueryFailedError) {
    const message = handleDatabaseError(err);
    error = new AppError(message, 400);
  }

  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = new AppError(message, 401);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = new AppError(message, 401);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(!config.IN_PROD && { stack: error.stack }),
  });
};

const handleDatabaseError = (err: QueryFailedError): string => {
  const code = (err as any)?.code;

  if (code === "23505") {
    const match = err.message.match(/Key \(([^)]+)\)/);
    const field = match ? match[1] : "field";
    return `${field} already exists`;
  }

  if (code === "23503") {
    return "Invalid reference provided";
  }

  if (code === "23502") {
    return "Required field is missing";
  }

  return "Database error occurred";
};

(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
