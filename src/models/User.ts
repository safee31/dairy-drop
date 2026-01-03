import Joi from "joi";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
  Relation,
} from "typeorm";
import { Role } from "./Role";
import { Address } from "./Address";

@Entity("users")
@Index(["email"])
@Index(["isActive", "isVerified"])
@Index(["roleId"])
export class User {
  @PrimaryColumn("varchar", { length: 50 })
  id!: string;

  @Column("varchar", { length: 255, unique: true })
  email!: string;

  @Column("varchar", { length: 255 })
  password!: string;

  @Column("varchar", { length: 100 })
  fullName!: string;

  @Column("varchar", { length: 500, nullable: true })
  profileImage!: string | null;

  @Column("varchar", { length: 20, nullable: true })
  phoneNumber!: string | null;

  @Column("boolean", { default: true })
  isActive!: boolean;

  @Column("boolean", { default: false })
  isVerified!: boolean;

  @Column("timestamp", { nullable: true })
  lastLoginAt!: Date | null;

  @Column("varchar", { length: 50, nullable: true })
  roleId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Role, (role) => role.users, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "roleId" })
  role!: Relation<Role> | null;

  @OneToMany(() => Address, (address) => address.user, {
    onDelete: "CASCADE",
  })
  addresses!: Relation<Address[]>;
}

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
  }).min(1),

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
  hashPassword: async (
    password: string,
    saltRounds: number = 12,
  ): Promise<string> => {
    return await bcrypt.hash(password, saltRounds);
  },

  comparePassword: async (
    password: string,
    hashedPassword: string,
  ): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
  },

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

  verifyJWT: (token: string, secret: string): Record<string, unknown> => {
    try {
      return jwt.verify(token, secret) as Record<string, unknown>;
    } catch {
      throw new Error("Invalid or expired token");
    }
  },

  generateSecureToken: (length: number = 32): string => {
    return crypto.randomBytes(length).toString("hex");
  },

  hashToken: (token: string): string => {
    return crypto.createHash("sha256").update(token).digest("hex");
  },
};

export { userSchemas, authUtils };
