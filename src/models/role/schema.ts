import Joi from "joi";

export class CreateRole {
  type!: number;
  name!: string;
  description?: string | null;
  permissions?: Record<string, boolean>;
}

export class UpdateRole {
  name?: string;
  description?: string | null;
  permissions?: Record<string, boolean>;
  isActive?: boolean;
}

const roleSchemas = {
  create: Joi.object({
    type: Joi.number()
      .integer()
      .valid(1, 2)
      .required()
      .messages({
        "number.base": "Role type must be a number",
        "any.only": "Role type must be 1 (Admin) or 2 (Customer)",
        "any.required": "Role type is required",
      }),

    name: Joi.string().trim().min(2).max(50).required().messages({
      "string.empty": "Role name is required",
      "string.min": "Role name must be at least 2 characters long",
      "string.max": "Role name cannot exceed 50 characters",
    }),

    description: Joi.string()
      .trim()
      .max(250)
      .optional()
      .allow(null, "")
      .messages({
        "string.max": "Description cannot exceed 250 characters",
      }),

    permissions: Joi.object()
      .pattern(Joi.string(), Joi.boolean())
      .optional()
      .default({}),

    isActive: Joi.boolean().default(true).optional(),
  }),

  update: Joi.object({
    name: Joi.string().trim().min(2).max(50).optional().messages({
      "string.min": "Role name must be at least 2 characters long",
      "string.max": "Role name cannot exceed 50 characters",
    }),

    description: Joi.string()
      .trim()
      .max(250)
      .optional()
      .allow(null, "")
      .messages({
        "string.max": "Description cannot exceed 250 characters",
      }),

    permissions: Joi.object()
      .pattern(Joi.string(), Joi.boolean())
      .optional(),

    isActive: Joi.boolean().optional(),
  }).min(1),

  updatePermissions: Joi.object({
    permissions: Joi.object()
      .pattern(Joi.string(), Joi.boolean())
      .required()
      .messages({
        "object.base": "Permissions must be an object",
        "any.required": "Permissions are required",
      }),
  }),

  params: {
    id: Joi.string().trim().required().messages({
      "string.empty": "Role ID is required",
    }),

    type: Joi.number().integer().valid(1, 2).optional().messages({
      "number.base": "Role type must be a number",
      "any.only": "Role type must be 1 (Admin) or 2 (Customer)",
    }),
  },

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(10).optional(),
    search: Joi.string().trim().min(1).optional(),
    type: Joi.number().integer().valid(1, 2, 3).optional(),
    isActive: Joi.boolean().optional(),
    hasPermission: Joi.string().trim().optional(),
    sortBy: Joi.string().valid("name", "type", "createdAt", "updatedAt").default("type").optional(),
    sortOrder: Joi.string().valid("asc", "desc").default("asc").optional(),
  }),

  bulkCreate: Joi.object({
    roles: Joi.array()
      .items(
        Joi.object({
          type: Joi.number().integer().valid(1, 2).required(),
          name: Joi.string().trim().min(2).max(50).required(),
          description: Joi.string().trim().max(250).optional().allow(null, ""),
          permissions: Joi.object()
            .pattern(Joi.string(), Joi.boolean())
            .optional()
            .default({}),
          isActive: Joi.boolean().default(true).optional(),
        }),
      )
      .min(1)
      .max(20)
      .required()
      .messages({
        "array.min": "At least one role is required",
        "array.max": "Cannot create more than 20 roles at once",
      }),
  }),

  bulkUpdatePermissions: Joi.object({
    roleIds: Joi.array()
      .items(Joi.string().trim().required())
      .min(1)
      .max(50)
      .required()
      .messages({
        "array.min": "At least one role ID is required",
        "array.max": "Cannot update more than 50 roles at once",
      }),
    permissions: Joi.object()
      .pattern(Joi.string(), Joi.boolean())
      .required()
      .messages({
        "object.base": "Permissions must be an object",
        "any.required": "Permissions are required",
      }),
    operation: Joi.string().valid("merge", "replace").default("merge").optional(),
  }),

  clone: Joi.object({
    name: Joi.string().trim().min(2).max(50).required().messages({
      "string.empty": "New role name is required",
      "string.min": "Role name must be at least 2 characters long",
      "string.max": "Role name cannot exceed 50 characters",
    }),
    type: Joi.number().integer().valid(1, 2, 3).optional(),
    description: Joi.string().trim().max(250).optional().allow(null, ""),
    copyPermissions: Joi.boolean().default(true).optional(),
  }),
};

export default roleSchemas;
