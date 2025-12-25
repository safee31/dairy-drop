import crypto from "crypto";
import config from "../config/env";

/**
 * Generate a secure OTP code
 */
export const generateOTP = (length: number = config.OTP_LENGTH): string => {
  const digits = "0123456789";
  let otp = "";

  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }

  return otp;
};

/**
 * Generate OTP with expiry
 */
export const generateOTPWithExpiry = (
  length: number = config.OTP_LENGTH,
  expiryMinutes: number = config.OTP_EXPIRY_MINUTES,
) => {
  const otp = generateOTP(length);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  return {
    code: otp,
    expiresAt,
    isExpired: () => new Date() > expiresAt,
  };
};

/**
 * Verify OTP code
 */
export const verifyOTP = (
  inputOTP: string,
  storedOTP: string,
  expiresAt: Date,
): boolean => {
  if (new Date() > expiresAt) {
    return false; // OTP expired
  }

  return inputOTP === storedOTP;
};

/**
 * Generate secure reset token
 */
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Hash reset token for storage
 */
export const hashResetToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export default {
  generateOTP,
  generateOTPWithExpiry,
  verifyOTP,
  generateResetToken,
  hashResetToken,
};
