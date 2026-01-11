import { setKey, getKey, delKey, incrementKey } from "./redisClient";
import config from "@/config/env";
import { logger } from "@/utils/logger";

const OTP_MAX_ATTEMPTS = config.OTP_RATE_LIMIT_MAX_REQUESTS || 3;

// Generate a random numeric OTP
export const generateOTP = (): string => {
  const length = config.OTP_LENGTH || 4;
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

export const storeOTP = async (
  email: string,
  otp: string,
  purpose: "verify" | "reset"
): Promise<boolean> => {
  try {
    const key = `otp:${purpose}:${email}`;
    const attemptKey = `otp:${purpose}:${email}:attempts`;
    const ttlSeconds = (config.OTP_EXPIRY_MINUTES || 60) * 60;

    // store OTP with TTL
    await setKey(key, otp, ttlSeconds);

    // initialize attempt counter if not exists
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

export const verifyOTP = async (
  email: string,
  otp: string,
  purpose: "verify" | "reset"
): Promise<boolean> => {
  try {
    const key = `otp:${purpose}:${email}`;
    const attemptKey = `otp:${purpose}:${email}:attempts`;

    // check and increment attempts
    const storedOTP = await getKey(key);
    if (!storedOTP) {
      return false;
    }

    const attempts = await incrementKey(attemptKey);
    if (attempts > OTP_MAX_ATTEMPTS) {
      await delKey(key);
      return false;
    }

    const isValid = storedOTP === otp;
    if (isValid) await delKey(key, attemptKey);

    return isValid;
  } catch (error) {
    logger.error(`OTP verification failed for ${email}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return false;
  }
};
