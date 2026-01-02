import Joi from "joi";
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  Relation,
} from "typeorm";
import { User } from "./User";

@Entity("addresses")
@Index(["userId", "isActive"])
@Index(["userId", "isPrimary"])
export class Address {
  @PrimaryColumn("varchar", { length: 50 })
  id!: string;

  @Column("varchar", { length: 50 })
  userId!: string;

  @Column("varchar", { length: 50, nullable: true })
  label!: string | null;

  @Column("varchar", { length: 100 })
  fullName!: string;

  @Column("varchar", { length: 20, nullable: true })
  phoneNumber!: string | null;

  @Column("varchar", { length: 255 })
  streetAddress!: string;

  @Column("varchar", { length: 50, nullable: true })
  apartment!: string | null;

  @Column("varchar", { length: 100 })
  city!: string;

  @Column("varchar", { length: 100, nullable: true })
  state!: string | null;

  @Column("varchar", { length: 20 })
  postalCode!: string;

  @Column("varchar", { length: 100 })
  country!: string;

  @Column("boolean", { default: false })
  isPrimary!: boolean;

  @Column("boolean", { default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.addresses, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user!: Relation<User>;
}

const addressSchemas = {
  create: Joi.object({
    label: Joi.string()
      .trim()
      .max(50)
      .optional()
      .allow(null, ""),

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

    streetAddress: Joi.string().trim().min(5).max(255).required().messages({
      "string.empty": "Street address is required",
      "string.min": "Street address must be at least 5 characters long",
      "string.max": "Street address cannot exceed 255 characters",
    }),

    apartment: Joi.string()
      .trim()
      .max(50)
      .optional()
      .allow(null, ""),

    city: Joi.string().trim().min(2).max(100).required().messages({
      "string.empty": "City is required",
      "string.min": "City must be at least 2 characters long",
      "string.max": "City cannot exceed 100 characters",
    }),

    state: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow(null, ""),

    postalCode: Joi.string().trim().min(2).max(20).required().messages({
      "string.empty": "Postal code is required",
      "string.min": "Postal code must be at least 2 characters long",
      "string.max": "Postal code cannot exceed 20 characters",
    }),

    country: Joi.string().trim().min(2).max(100).required().messages({
      "string.empty": "Country is required",
      "string.min": "Country must be at least 2 characters long",
      "string.max": "Country cannot exceed 100 characters",
    }),

    isPrimary: Joi.boolean().default(false).optional(),
  }),

  update: Joi.object({
    label: Joi.string()
      .trim()
      .max(50)
      .optional()
      .allow(null, ""),

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

    streetAddress: Joi.string().trim().min(5).max(255).optional().messages({
      "string.min": "Street address must be at least 5 characters long",
      "string.max": "Street address cannot exceed 255 characters",
    }),

    apartment: Joi.string()
      .trim()
      .max(50)
      .optional()
      .allow(null, ""),

    city: Joi.string().trim().min(2).max(100).optional().messages({
      "string.min": "City must be at least 2 characters long",
      "string.max": "City cannot exceed 100 characters",
    }),

    state: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow(null, ""),

    postalCode: Joi.string().trim().min(2).max(20).optional().messages({
      "string.min": "Postal code must be at least 2 characters long",
      "string.max": "Postal code cannot exceed 20 characters",
    }),

    country: Joi.string().trim().min(2).max(100).optional().messages({
      "string.min": "Country must be at least 2 characters long",
      "string.max": "Country cannot exceed 100 characters",
    }),

    isPrimary: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),

  params: {
    id: Joi.string().trim().required().messages({
      "string.empty": "Address ID is required",
    }),
  },

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(10).optional(),
    isPrimary: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string()
      .valid("createdAt", "updatedAt", "label", "city")
      .default("createdAt")
      .optional(),
    sortOrder: Joi.string().valid("asc", "desc").default("desc").optional(),
  }),
};

export default addressSchemas;
