import Joi from "joi";

export const categorySchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Category name is required",
      "string.min": "Category name must be at least 1 character",
      "string.max": "Category name cannot exceed 100 characters",
    }),

    slug: Joi.string().trim().lowercase().min(1).max(50).required().messages({
      "string.empty": "Category slug is required",
      "string.min": "Category slug must be at least 1 character",
      "string.max": "Category slug cannot exceed 50 characters",
    }),

    description: Joi.string().trim().max(255).optional().allow(null).messages({
      "string.max": "Description cannot exceed 255 characters",
    }),

    imageUrl: Joi.string().trim().max(255).uri().optional().allow(null).messages({
      "string.max": "Image URL cannot exceed 255 characters",
      "string.uri": "Image URL must be a valid URI",
    }),

    displayOrder: Joi.number().integer().min(0).optional().default(0).messages({
      "number.base": "Display order must be a number",
      "number.min": "Display order cannot be negative",
    }),

    isActive: Joi.boolean().optional().default(true),
  }),

  update: Joi.object({
    name: Joi.string().trim().min(1).max(100).optional().messages({
      "string.min": "Category name must be at least 1 character",
      "string.max": "Category name cannot exceed 100 characters",
    }),

    slug: Joi.string().trim().lowercase().min(1).max(50).optional().messages({
      "string.min": "Category slug must be at least 1 character",
      "string.max": "Category slug cannot exceed 50 characters",
    }),

    description: Joi.string().trim().max(255).optional().allow(null).messages({
      "string.max": "Description cannot exceed 255 characters",
    }),

    imageUrl: Joi.string().trim().max(255).uri().optional().allow(null).messages({
      "string.max": "Image URL cannot exceed 255 characters",
      "string.uri": "Image URL must be a valid URI",
    }),

    displayOrder: Joi.number().integer().min(0).optional().messages({
      "number.base": "Display order must be a number",
      "number.min": "Display order cannot be negative",
    }),

    isActive: Joi.boolean().optional(),
  }),

  list: Joi.object({
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().trim().optional(),
    order: Joi.string().trim().valid("ASC", "DESC").optional().default("ASC"),
    limit: Joi.number().integer().min(1).max(100).optional().default(10),
    offset: Joi.number().integer().min(0).optional().default(0),
  }),
};
