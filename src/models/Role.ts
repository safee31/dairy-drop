import Joi from "joi";

// Role validation schemas
const roleSchemas = {
  // Schema for creating a new role
  create: Joi.object({
    type: Joi.number()
      .integer()
      .valid(1, 2) // 1 = Admin, 2 = Customer
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
      .default({})
      .description(
        'Key-Value permissions (e.g., { "create_user": true, "delete_user": false })',
      ),

    isActive: Joi.boolean().default(true).optional(),
  }),

  // Schema for updating a role
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
      .optional()
      .description("Key-Value permissions"),

    isActive: Joi.boolean().optional(),
  }).min(1), // At least one field must be provided for update

  // Schema for updating permissions only
  updatePermissions: Joi.object({
    permissions: Joi.object()
      .pattern(Joi.string(), Joi.boolean())
      .required()
      .messages({
        "object.base": "Permissions must be an object",
        "any.required": "Permissions are required",
      }),
  }),

  // Schema for role ID parameter
  params: {
    id: Joi.string().trim().required().messages({
      "string.empty": "Role ID is required",
    }),

    type: Joi.number().integer().valid(1, 2).optional().messages({
      "number.base": "Role type must be a number",
      "any.only": "Role type must be 1 (Admin) or 2 (Customer)",
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
      .description("Search in role name or description"),

    type: Joi.number()
      .integer()
      .valid(1, 2, 3)
      .optional()
      .description("Filter by role type"),

    isActive: Joi.boolean().optional().description("Filter by active status"),

    hasPermission: Joi.string()
      .trim()
      .optional()
      .description("Filter roles that have a specific permission"),

    sortBy: Joi.string()
      .valid("name", "type", "createdAt", "updatedAt")
      .default("type")
      .optional(),

    sortOrder: Joi.string().valid("asc", "desc").default("asc").optional(),
  }),

  // Schema for bulk operations
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

  // Schema for bulk permission update
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

    operation: Joi.string()
      .valid("merge", "replace")
      .default("merge")
      .optional()
      .description(
        "Whether to merge with existing permissions or replace them",
      ),
  }),

  // Schema for role cloning
  clone: Joi.object({
    name: Joi.string().trim().min(2).max(50).required().messages({
      "string.empty": "New role name is required",
      "string.min": "Role name must be at least 2 characters long",
      "string.max": "Role name cannot exceed 50 characters",
    }),

    type: Joi.number()
      .integer()
      .valid(1, 2, 3)
      .optional()
      .description("New role type (defaults to source role type)"),

    description: Joi.string()
      .trim()
      .max(250)
      .optional()
      .allow(null, "")
      .description("New role description"),

    copyPermissions: Joi.boolean()
      .default(true)
      .optional()
      .description("Whether to copy permissions from source role"),
  }),
};

export default roleSchemas;
