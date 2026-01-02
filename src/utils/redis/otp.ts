import { setKey, getKey, delKey, incrementKey } from "./redisClient";
import config from "@/config/env";
import { logger } from "@/utils/logger";

// Use config value for OTP verification attempt limit
const OTP_MAX_ATTEMPTS = config.OTP_RATE_LIMIT_MAX_REQUESTS || 3;

/**
 * Generate a random OTP
 */
export const generateOTP = (): string => {
  const length = config.OTP_LENGTH || 4;
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

/**
 * Store OTP in Redis with TTL from config
 * @param email - User email
 * @param otp - OTP code to store
 * @param purpose - Purpose of OTP ('verify' for email verification, 'reset' for password reset)
 * @returns true if stored successfully
 */
export const storeOTP = async (
  email: string,
  otp: string,
  purpose: "verify" | "reset"
): Promise<boolean> => {
  try {
    const key = `otp:${purpose}:${email}`;
    const attemptKey = `otp:${purpose}:${email}:attempts`;
    const ttlSeconds = (config.OTP_EXPIRY_MINUTES || 60) * 60;

    // Store OTP with TTL
    await setKey(key, otp, ttlSeconds);

    // Initialize attempt counter if not exists
    const attempts = await getKey(attemptKey);
    if (!attempts) {
      await setKey(attemptKey, "0", ttlSeconds);
    }


    return true;
  } catch (error) {
    logger.error(`Failed to store OTP for ${email}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return false;
  }
};

/**
 * Verify OTP code
 * @param email - User email
 * @param otp - OTP code to verify
 * @param purpose - Purpose of OTP ('verify' or 'reset')
 * @returns true if OTP is valid, false otherwise
 */
export const verifyOTP = async (
  email: string,
  otp: string,
  purpose: "verify" | "reset"
): Promise<boolean> => {
  try {
    const key = `otp:${purpose}:${email}`;
    const attemptKey = `otp:${purpose}:${email}:attempts`;

    // Check and increment attempts
    const storedOTP = await getKey(key);
    if (!storedOTP) {
      logger.warn(`OTP not found or expired for ${email}`);
      return false;
    }

    const attempts = await incrementKey(attemptKey);
    if (attempts > OTP_MAX_ATTEMPTS) {
      logger.warn(`OTP verification attempts exceeded for ${email}`);
      await delKey(key);
      return false;
    }

    const isValid = storedOTP === otp;
    if (isValid) {
      // Delete OTP on successful verification
      await delKey(key, attemptKey);
    } else {
      logger.warn(`Invalid OTP attempt for ${email}`);
    }

    return isValid;
  } catch (error) {
    logger.error(`OTP verification failed for ${email}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return false;
  }
};
