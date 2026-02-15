import Joi from "joi";

export class CreateInventoryHistory {
  inventoryId!: string;
  quantityChange!: number;
  newStockQuantity!: number;
  type!: "purchase" | "sale" | "return" | "adjustment" | "initial";
  referenceId?: string | null;
  notes?: string | null;
}

const inventoryHistorySchemas = {
  adjustStock: Joi.object({
    quantityChange: Joi.number().integer().not(0).optional().messages({
      "number.base": "Quantity change must be a number",
      "any.invalid": "Quantity change cannot be zero",
    }),
    operationType: Joi.string()
      .valid("purchase", "sale", "return", "adjustment")
      .when("quantityChange", {
        is: Joi.exist(),
        then: Joi.required(),
        otherwise: Joi.optional(),
      })
      .messages({
        "any.only":
          "Operation type must be one of: purchase, sale, return, adjustment",
      }),
    reorderLevel: Joi.number().integer().min(0).optional().messages({
      "number.base": "Reorder level must be a non-negative number",
    }),
    referenceId: Joi.string().max(100).optional().allow(null, ""),
    notes: Joi.string().optional().allow(null, ""),
  }).or("quantityChange", "reorderLevel").messages({
    "object.missing":
      "At least one of quantity change or reorder level is required",
  }),
};

export default inventoryHistorySchemas;
