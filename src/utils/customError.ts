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
    "No account found with this email. Please check your email or register.",
  EMAIL_NOT_VERIFIED:
    "Please verify your email address. Check your inbox for a verification link.",
  ACCOUNT_INACTIVE:
    "Your account has been deactivated. Please contact our support team for assistance.",
  ACCOUNT_NOT_APPROVED:
    "Your account is pending approval. You will be notified once approved.",
  INVALID_TOKEN: "Your session has expired. Please log in again.",
  TOKEN_REQUIRED: "Please log in to access this feature.",
  INSUFFICIENT_PERMISSIONS:
    "You don't have permission to perform this action. Please contact your administrator.",
  RATE_LIMIT_EXCEEDED:
    "Too many attempts. Please wait a few minutes and try again.",
  INVALID_OTP:
    "Invalid or expired verification code. Please request a new one.",
  PASSWORD_TOO_WEAK:
    "Password must be at least 8 characters with letters, numbers, and symbols.",
  EMAIL_ALREADY_EXISTS:
    "An account with this email already exists. Please log in or use a different email.",
  INVALID_RESET_SESSION:
    "Password reset link has expired. Please request a new one.",
} as const;

export default customError;
