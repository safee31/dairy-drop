import Joi from "joi";
import { productUtils } from "./utils";

const discountSchema = Joi.object({
  type: Joi.string()
    .valid("percentage", "fixed")
    .required()
    .messages({ "any.only": "Discount type must be 'percentage' or 'fixed'" }),
  value: Joi.number()
    .positive()
    .required()
    .messages({ "number.positive": "Discount value must be positive" }),
})
  .optional()
  .messages({ "object.base": "Discount must be an object with type and value" });

export class CreateProduct {
  name!: string;
  description!: string;
  sku!: string;
  categoryLevel2Id!: string;
  price!: number;
  brand!: string;
  fatContent!: string;
  weight!: {
    value: number;
    unit: "g" | "kg" | "ml" | "L" | "piece";
  };
  shelfLife!: string;
  discount?: {
    type: "percentage" | "fixed";
    value: number;
  };
}

export class UpdateProduct {
  name?: string;
  description?: string;
  sku?: string;
  categoryLevel2Id?: string;
  price?: number;
  brand?: string;
  fatContent?: string;
  weight?: {
    value: number;
    unit: "g" | "kg" | "ml" | "L" | "piece";
  };
  shelfLife?: string;
  isActive?: boolean;
  discount?: {
    type: "percentage" | "fixed";
    value: number;
  } | null;
}

const productSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(2)
      .max(200)
      .required()
      .messages({ "string.empty": "Product name is required" }),

    description: Joi.string()
      .min(10)
      .required()
      .messages({ "string.empty": "Product description is required" }),

    sku: Joi.string()
      .pattern(/^[A-Z0-9-]+$/)
      .required()
      .messages({
        "string.pattern.base":
          "SKU must contain only uppercase letters, numbers, and hyphens",
        "string.empty": "SKU is required",
      }),

    categoryLevel2Id: Joi.string()
      .uuid()
      .required()
      .messages({ "string.guid": "Invalid category ID" }),

    price: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({ "number.positive": "Price must be positive" }),

    brand: Joi.string()
      .max(50)
      .required()
      .messages({ "string.empty": "Brand is required" }),

    fatContent: Joi.string()
      .max(30)
      .required()
      .messages({ "string.empty": "Fat content is required" }),

    weight: Joi.object({
      value: Joi.number()
        .positive()
        .required()
        .messages({ "number.positive": "Weight value must be positive" }),
      unit: Joi.string()
        .valid("g", "kg", "ml", "L", "piece")
        .required()
        .messages({ "any.only": "Unit must be g, kg, ml, L, or piece" }),
    })
      .required()
      .messages({ "object.base": "Weight must be an object with value and unit" }),

    shelfLife: Joi.string()
      .max(50)
      .required()
      .messages({ "string.empty": "Shelf life is required" }),

    discount: discountSchema.external(async (value, helpers) => {
      try {
        const price = helpers.state.ancestors[0]?.price;
        if (value && price) {
          productUtils.validateDiscount(value, price);
        }
      } catch (err: any) {
        throw helpers.error("any.custom", { message: err.message });
      }
    }),

    images: Joi.array()
      .items(
        Joi.object({
          imageUrl: Joi.string()
            .uri()
            .required()
            .messages({ "string.uri": "Image URL must be valid" }),
          isPrimary: Joi.boolean().optional().default(false),
        }),
      )
      .optional()
      .default([]),
  }),

  update: Joi.object({
    name: Joi.string()
      .min(2)
      .max(200)
      .optional(),

    description: Joi.string()
      .min(10)
      .optional(),

    sku: Joi.string()
      .pattern(/^[A-Z0-9-]+$/)
      .optional(),

    categoryLevel2Id: Joi.string()
      .uuid()
      .optional(),

    price: Joi.number()
      .positive()
      .precision(2)
      .optional(),

    brand: Joi.string()
      .max(50)
      .optional(),

    fatContent: Joi.string()
      .max(30)
      .optional(),

    weight: Joi.object({
      value: Joi.number()
        .positive()
        .required(),
      unit: Joi.string()
        .valid("g", "kg", "ml", "L", "piece")
        .required(),
    }).optional(),

    shelfLife: Joi.string()
      .max(50)
      .optional(),

    isActive: Joi.boolean().optional(),

    discount: discountSchema.external(async (value, helpers) => {
      try {
        const price = helpers.state.ancestors[0]?.price;
        if (value && price) {
          productUtils.validateDiscount(value, price);
        }
      } catch (err: any) {
        throw helpers.error("any.custom", { message: err.message });
      }
    }),
  }),

  updateImages: Joi.object({
    images: Joi.array()
      .items(
        Joi.object({
          imageUrl: Joi.string()
            .uri()
            .required()
            .messages({ "string.uri": "Image URL must be valid" }),
          isPrimary: Joi.boolean().optional().default(false),
        }),
      )
      .required()
      .min(1)
      .messages({
        "array.min": "At least one image is required",
        "array.base": "Images must be an array",
      }),
  }),
};

export default productSchemas;
