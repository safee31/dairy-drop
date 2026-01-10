import Joi from "joi";

export const categoryLevel2Schemas = {
  create: Joi.object({
    categoryId: Joi.string().trim().guid({ version: "uuidv4" }).required().messages({
      "string.empty": "Category ID is required",
      "string.guid": "Category ID must be a valid UUID",
    }),

    categoryLevel1Id: Joi.string()
      .trim()
      .guid({ version: "uuidv4" })
      .required()
      .messages({
        "string.empty": "Category Level 1 ID is required",
        "string.guid": "Category Level 1 ID must be a valid UUID",
      }),

    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Level 2 category name is required",
      "string.min": "Name must be at least 1 character",
      "string.max": "Name cannot exceed 100 characters",
    }),

    slug: Joi.string().trim().lowercase().min(1).max(50).required().messages({
      "string.empty": "Level 2 category slug is required",
      "string.min": "Slug must be at least 1 character",
      "string.max": "Slug cannot exceed 50 characters",
    }),

    description: Joi.string().trim().max(255).optional().allow(null).messages({
      "string.max": "Description cannot exceed 255 characters",
    }),

    displayOrder: Joi.number().integer().min(0).optional().default(0).messages({
      "number.base": "Display order must be a number",
      "number.min": "Display order cannot be negative",
    }),

    isActive: Joi.boolean().optional().default(true),
  }),

  update: Joi.object({
    name: Joi.string().trim().min(1).max(100).optional().messages({
      "string.min": "Name must be at least 1 character",
      "string.max": "Name cannot exceed 100 characters",
    }),

    slug: Joi.string().trim().lowercase().min(1).max(50).optional().messages({
      "string.min": "Slug must be at least 1 character",
      "string.max": "Slug cannot exceed 50 characters",
    }),

    description: Joi.string().trim().max(255).optional().allow(null).messages({
      "string.max": "Description cannot exceed 255 characters",
    }),

    displayOrder: Joi.number().integer().min(0).optional().messages({
      "number.base": "Display order must be a number",
      "number.min": "Display order cannot be negative",
    }),

    isActive: Joi.boolean().optional(),
  }),

  list: Joi.object({
    categoryId: Joi.string().trim().guid({ version: "uuidv4" }).optional(),
    categoryLevel1Id: Joi.string().trim().guid({ version: "uuidv4" }).optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().trim().optional(),
    order: Joi.string().trim().valid("ASC", "DESC").optional().default("ASC"),
    limit: Joi.number().integer().min(1).max(100).optional().default(10),
    offset: Joi.number().integer().min(0).optional().default(0),
  }),
};
