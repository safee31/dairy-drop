import { Request, Response, NextFunction } from "express";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client";
import { logger } from "../utils/logger";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): Response | void => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error("API Error", {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    const message = handlePrismaError(err);
    error = new AppError(message, 400);
  }

  // Prisma validation errors
  if (err instanceof PrismaClientValidationError) {
    const message = "Invalid data provided";
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = new AppError(message, 401);
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = new AppError(message, 401);
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    },
  });
};

const handlePrismaError = (err: PrismaClientKnownRequestError): string => {
  switch (err.code) {
    case "P2002": {
      // Unique constraint violation
      const target = err.meta?.target as string[];
      return `${target?.join(", ")} already exists`;
    }
    case "P2014":
      return "Invalid ID provided";
    case "P2003": {
      // Foreign key constraint violation
      const fieldName = err.meta?.field_name as string;
      if (fieldName === "users_roleId_fkey") {
        return "Role not found. Please provide a valid role ID.";
      }
      return "Invalid reference provided";
    }
    case "P2025":
      return "Record not found";
    default:
      return "Database error occurred";
  }
};

// Async error wrapper
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
