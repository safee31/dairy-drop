import Joi from "joi";

export class CreateInventoryHistory {
  inventoryId!: string;
  quantityChange!: number;
  newStockQuantity!: number;
  type!: "purchase" | "sale" | "return" | "adjustment" | "initial";
  referenceId?: string | null;
  notes?: string | null;
}

export interface UpdateInventoryHistory {
  notes?: string | null;
}

const inventoryHistorySchemas = {
  create: Joi.object<CreateInventoryHistory>({
    inventoryId: Joi.string().uuid().required().messages({
      "string.guid": "Invalid inventory ID",
    }),
    quantityChange: Joi.number().integer().required().messages({
      "number.base": "Quantity change must be a number",
    }),
    newStockQuantity: Joi.number().integer().min(0).required().messages({
      "number.base": "New stock quantity must be a non-negative number",
    }),
    type: Joi.string()
      .valid("purchase", "sale", "return", "adjustment", "initial")
      .required()
      .messages({
        "any.only": "Type must be one of: purchase, sale, return, adjustment, initial",
      }),
    referenceId: Joi.string().max(100).optional().allow(null),
    notes: Joi.string().optional().allow(null),
  }),

  update: Joi.object<UpdateInventoryHistory>({
    notes: Joi.string().optional().allow(null),
  }),
};

export default inventoryHistorySchemas;
