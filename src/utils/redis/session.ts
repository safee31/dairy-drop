import { setKey, getKey, delKey, incrementKey } from "./redisClient";
import config from "@/config/env";
import { logger } from "@/utils/logger";

// Use config values for failed login tracking
const FAILED_LOGIN_WINDOW_SECONDS = (config.RATE_LIMIT_WINDOW_MS || 15) * 60; // Convert minutes to seconds
const MAX_FAILED_LOGIN_ATTEMPTS = config.LOGIN_RATE_LIMIT_MAX_REQUESTS || 5;

/**
 * Track failed login attempts
 * @param email - User email
 */
export const trackFailedLogin = async (email: string): Promise<void> => {
  try {
    const key = `failed_login:${email}`;
    const attempts = await incrementKey(key);
    if (attempts === 1) {
      await setKey(key, "1", FAILED_LOGIN_WINDOW_SECONDS);
    }
  } catch (error) {
    logger.error(`Failed to track login attempt for ${email}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

/**
 * Check if account is locked due to failed login attempts
 * @param email - User email
 * @param maxAttempts - Max allowed attempts (default: 5)
 */
export const isAccountLockedByFailedLogins = async (
  email: string,
  maxAttempts: number = MAX_FAILED_LOGIN_ATTEMPTS
): Promise<boolean> => {
  try {
    const key = `failed_login:${email}`;
    const attempts = await getKey(key);
    return attempts ? parseInt(attempts, 10) >= maxAttempts : false;
  } catch (error) {
    logger.error(`Failed to check account lock status for ${email}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return false;
  }
};

/**
 * Reset failed login attempts
 * @param email - User email
 */
export const resetFailedLoginAttempts = async (email: string): Promise<void> => {
  try {
    const key = `failed_login:${email}`;
    await delKey(key);
  } catch (error) {
    logger.error(`Failed to reset login attempts for ${email}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};
