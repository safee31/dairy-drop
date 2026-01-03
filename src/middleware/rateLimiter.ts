import { Request, Response, NextFunction } from "express";
import { customError, AuthErrors } from "../utils/customError";
import config from "../config/env";

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Rate limiting middleware
 */
export const rateLimiter = (config: RateLimitConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : req.ip || "unknown";
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return next();
    }

    if (record.count >= config.maxRequests) {
      return next(
        customError(config.message || AuthErrors.RATE_LIMIT_EXCEEDED, 429),
      );
    }

    // Increment count
    record.count++;
    rateLimitStore.set(key, record);

    next();
  };
};

/**
 * Login-specific rate limiter
 */
export const loginRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: config.LOGIN_RATE_LIMIT_MAX_REQUESTS, // 5 login attempts per 15 minutes
  message: "Too many login attempts. Please try again later.",
  keyGenerator: (req) => `login:${req.ip}:${req.body.email || "unknown"}`,
});

/**
 * OTP rate limiter
 */
export const otpRateLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: config.OTP_RATE_LIMIT_MAX_REQUESTS, // 3 OTP requests per 5 minutes
  message: "Too many OTP requests. Please try again later.",
  keyGenerator: (req) => `otp:${req.ip}:${req.body.email || "unknown"}`,
});

/**
 * Password reset rate limiter
 */
export const passwordResetRateLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: config.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS, // 3 password reset requests per hour
  message: "Too many password reset requests. Please try again later.",
  keyGenerator: (req) => `reset:${req.ip}:${req.body.email || "unknown"}`,
});

/**
 * General API rate limiter
 */
export const apiRateLimiter = rateLimiter({
  windowMs: config.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // Default: 15 minutes in milliseconds
  maxRequests: config.RATE_LIMIT_MAX_REQUESTS || 100, // Default: 100 requests per window
  message: "Too many requests. Please try again later.",
  keyGenerator: (req) => `api:${req.ip}`,
});

/**
 * Clean up expired rate limit records
 */
export const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Clean up every 15 minutes
if (typeof global !== "undefined") {
  global.setInterval(cleanupRateLimitStore, 15 * 60 * 1000);
}

export default {
  rateLimiter,
  loginRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
  apiRateLimiter,
  cleanupRateLimitStore,
};
