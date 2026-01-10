import Joi from "joi";

export class CreateUser {
  email!: string;
  fullName!: string;
  password!: string;
  phoneNumber?: string | null;
  profileImage?: string | null;
}

export class UpdateUser {
  fullName?: string;
  phoneNumber?: string | null;
  profileImage?: string | null;
  isActive?: boolean;
}

const userSchemas = {
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
      .optional()
      .messages({
        "any.only": "Passwords do not match",
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
  }).min(1),

  login: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),

    password: Joi.string().required().messages({
      "string.empty": "Password is required",
    }),
  }),

  verifyEmail: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),

    otp: Joi.string()
      .length(4)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        "string.empty": "OTP is required",
        "string.length": "OTP must be exactly 4 digits",
        "string.pattern.base": "OTP must contain only numbers",
      }),
  }),

  resendVerificationOTP: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),
  }),

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

  forgotPassword: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
    }),
  }),

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

  params: {
    id: Joi.string().trim().required().messages({
      "string.empty": "User ID is required",
    }),
  },

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(10).optional(),
    search: Joi.string().trim().min(1).optional(),
    roleId: Joi.string().trim().optional(),
    isActive: Joi.boolean().optional(),
    isVerified: Joi.boolean().optional(),
    sortBy: Joi.string()
      .valid("fullName", "email", "createdAt")
      .default("fullName")
      .optional(),
    sortOrder: Joi.string().valid("asc", "desc").default("asc").optional(),
  }),

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

const adminCustomerSchemas = {
  create: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Please provide a valid email address",
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
    fullName: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Full name is required",
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
  }),

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
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(
        new RegExp(
          "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]",
        ),
      )
      .optional()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.max": "Password cannot exceed 128 characters",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }),
    isActive: Joi.boolean().optional(),
  }).min(1),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(10).optional(),
    search: Joi.string().trim().min(1).optional(),
    isActive: Joi.boolean().optional(),
    isVerified: Joi.boolean().optional(),
    sortBy: Joi.string()
      .valid("fullName", "email", "createdAt", "updatedAt", "lastLoginAt")
      .default("createdAt")
      .optional(),
    sortOrder: Joi.string().valid("asc", "desc").default("desc").optional(),
  }),
};

export { userSchemas, adminCustomerSchemas };
export default userSchemas;
