/**
 * Custom error class for API errors
 */
export class CustomError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a custom error instance
 */
export const customError = (
  message: string,
  statusCode: number = 500,
  isOperational: boolean = true,
) => {
  return new CustomError(message, statusCode, isOperational);
};

/**
 * Common error messages for authentication
 */
export const AuthErrors = {
  INVALID_CREDENTIALS:
    "Invalid email or password. Please check your credentials and try again.",
  USER_NOT_FOUND:
    "No account found with this email. Please check your email or create a new account.",
  EMAIL_NOT_VERIFIED:
    "Please verify your email to complete your account setup. Check your inbox for a verification link.",
  ACCOUNT_INACTIVE:
    "Your account is currently inactive. Please contact our customer support team for assistance.",
  ACCOUNT_NOT_APPROVED:
    "Your account is being reviewed. You'll receive an email notification once approved.",
  INVALID_TOKEN: "Your session has expired. Please log in again to continue shopping.",
  TOKEN_REQUIRED: "Please log in to complete this action.",
  INSUFFICIENT_PERMISSIONS:
    "You don't have permission to access this area. If you think this is an error, please contact support.",
  RATE_LIMIT_EXCEEDED:
    "Too many login attempts. Please wait a few minutes and try again.",
  INVALID_OTP:
    "The verification code is invalid or expired. Please request a new code.",
  PASSWORD_TOO_WEAK:
    "Your password must be at least 8 characters and include letters, numbers, and symbols.",
  EMAIL_ALREADY_EXISTS:
    "An account with this email already exists. Please log in or use a different email address.",
  INVALID_RESET_SESSION:
    "Your password reset link has expired. Please request a new one to continue.",
} as const;

export default customError;
