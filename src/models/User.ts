import Joi from "joi";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// User validation schemas
const userSchemas = {
  // Schema for creating a new user (customer registration)
  create: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),

    fullName: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Full name is required",
      "string.min": "Full name must be at least 1 character long",
      "string.max": "Full name cannot exceed 100 characters",
    }),

    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(
        new RegExp(
          "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]",
        ),
      )
      .required()
      .messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 8 characters long",
        "string.max": "Password cannot exceed 128 characters",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }),

    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
        "string.empty": "Password confirmation is required",
      }),

    phoneNumber: Joi.string()
      .trim()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .allow(null, "")
      .messages({
        "string.pattern.base": "Please provide a valid phone number",
      }),

    profileImage: Joi.string()
      .trim()
      .uri()
      .optional()
      .allow(null, "")
      .messages({
        "string.uri": "Profile image must be a valid URL",
      }),
  }),

  // Schema for updating user profile
  update: Joi.object({
    fullName: Joi.string().trim().min(1).max(100).optional().messages({
      "string.min": "Full name must be at least 1 character long",
      "string.max": "Full name cannot exceed 100 characters",
    }),

    phoneNumber: Joi.string()
      .trim()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .allow(null, "")
      .messages({
        "string.pattern.base": "Please provide a valid phone number",
      }),

    profileImage: Joi.string()
      .trim()
      .uri()
      .optional()
      .allow(null, "")
      .messages({
        "string.uri": "Profile image must be a valid URL",
      }),

    isActive: Joi.boolean().optional(),
  }).min(1), // At least one field must be provided for update

  // Schema for user login
  login: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),

    password: Joi.string().required().messages({
      "string.empty": "Password is required",
    }),
  }),

  // Schema for email verification
  verifyEmail: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),

    otpCode: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        "string.empty": "OTP code is required",
        "string.length": "OTP code must be exactly 6 digits",
        "string.pattern.base": "OTP code must contain only numbers",
      }),
  }),

  // Schema for resending verification OTP
  resendVerificationOTP: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),
  }),

  // Schema for password change
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      "string.empty": "Current password is required",
    }),

    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(
        new RegExp(
          "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]",
        ),
      )
      .required()
      .messages({
        "string.empty": "New password is required",
        "string.min": "Password must be at least 8 characters long",
        "string.max": "Password cannot exceed 128 characters",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }),

    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
        "string.empty": "Password confirmation is required",
      }),
  }),

  // Schema for password reset request
  forgotPassword: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),
  }),

  // Schema for password reset with OTP
  resetPasswordWithOTP: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),

    otpCode: Joi.string()
      .length(6)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        "string.empty": "OTP code is required",
        "string.length": "OTP code must be exactly 6 digits",
        "string.pattern.base": "OTP code must contain only numbers",
      }),

    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(
        new RegExp(
          "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]",
        ),
      )
      .required()
      .messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 8 characters long",
        "string.max": "Password cannot exceed 128 characters",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }),

    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
        "string.empty": "Password confirmation is required",
      }),
  }),

  // Schema for password reset with session
  resetPasswordWithSession: Joi.object({
    sessionToken: Joi.string().required().messages({
      "string.empty": "Session token is required",
    }),

    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(
        new RegExp(
          "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]",
        ),
      )
      .required()
      .messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 8 characters long",
        "string.max": "Password cannot exceed 128 characters",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }),

    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
        "string.empty": "Password confirmation is required",
      }),
  }),

  // Schema for user ID parameter
  params: {
    id: Joi.string().trim().required().messages({
      "string.empty": "User ID is required",
    }),
  },

  // Schema for query parameters (filtering, pagination)
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),

    limit: Joi.number().integer().min(1).max(100).default(10).optional(),

    search: Joi.string()
      .trim()
      .min(1)
      .optional()
      .description("Search in full name or email"),

    roleId: Joi.string().trim().optional().description("Filter by role ID"),

    isActive: Joi.boolean().optional().description("Filter by active status"),

    isVerified: Joi.boolean()
      .optional()
      .description("Filter by verification status"),

    sortBy: Joi.string()
      .valid("fullName", "email", "createdAt")
      .default("fullName")
      .optional(),

    sortOrder: Joi.string().valid("asc", "desc").default("asc").optional(),
  }),

  // Schema for bulk operations
  bulkCreate: Joi.object({
    users: Joi.array()
      .items(
        Joi.object({
          email: Joi.string().trim().lowercase().email().required(),
          fullName: Joi.string().trim().min(1).max(100).required(),
          password: Joi.string().min(8).max(128).required(),
          phoneNumber: Joi.string()
            .trim()
            .pattern(/^\+?[1-9]\d{1,14}$/)
            .optional()
            .allow(null, ""),
          profileImage: Joi.string().trim().uri().optional().allow(null, ""),
          isActive: Joi.boolean().default(true).optional(),
        }),
      )
      .min(1)
      .max(50)
      .required()
      .messages({
        "array.min": "At least one user is required",
        "array.max": "Cannot create more than 50 users at once",
      }),
  }),
};

// Auth utility functions
const authUtils = {
  /**
   * Hash a password using bcrypt
   * @param password - Plain text password
   * @param saltRounds - Number of salt rounds (default: 12)
   * @returns Hashed password
   */
  hashPassword: async (
    password: string,
    saltRounds: number = 12,
  ): Promise<string> => {
    return await bcrypt.hash(password, saltRounds);
  },

  /**
   * Compare a plain text password with a hashed password
   * @param password - Plain text password
   * @param hashedPassword - Hashed password to compare against
   * @returns True if passwords match, false otherwise
   */
  comparePassword: async (
    password: string,
    hashedPassword: string,
  ): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
  },

  /**
   * Generate JWT token for user
   * @param user - User object with id, email, roleId
   * @param secret - JWT secret key
   * @param expiresIn - Token expiration time
   * @returns JWT token
   */
  generateJWT: (
    user: { id: string; email: string; roleId: string },
    secret: string,
    expiresIn: string = "15m",
  ): string => {
    const payload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      jti: Math.random().toString(36).substring(2, 15),
    };

    return jwt.sign(payload, secret, {
      expiresIn,
      issuer: "training-platform-api",
      audience: "training-platform-users",
    } as jwt.SignOptions);
  },

  /**
   * Verify JWT token
   * @param token - JWT token to verify
   * @param secret - JWT secret key
   * @returns Decoded token payload
   */
  verifyJWT: (token: string, secret: string): Record<string, unknown> => {
    try {
      return jwt.verify(token, secret) as Record<string, unknown>;
    } catch {
      throw new Error("Invalid or expired token");
    }
  },

  /**
   * Generate a secure random token
   * @param length - Length of the token (default: 32)
   * @returns Random token string
   */
  generateSecureToken: (length: number = 32): string => {
    return crypto.randomBytes(length).toString("hex");
  },

  /**
   * Hash a token using SHA-256
   * @param token - Token to hash
   * @returns Hashed token
   */
  hashToken: (token: string): string => {
    return crypto.createHash("sha256").update(token).digest("hex");
  },
};
export { userSchemas, authUtils };
