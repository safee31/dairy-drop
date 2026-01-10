import Joi from "joi";

export class CreateInventory {
  productId!: string;
  stockQuantity!: number;
  reservedQuantity?: number;
  reorderLevel?: number;
  inStock?: boolean;
  stockHistory?: Array<{
    date: Date;
    quantity: number;
    type: 'purchase' | 'sale' | 'return' | 'adjustment';
    referenceId?: string;
    notes?: string;
  }>;
}

export class UpdateInventory {
  stockQuantity?: number;
  reservedQuantity?: number;
  reorderLevel?: number;
  inStock?: boolean;
  stockHistory?: Array<{
    date: Date;
    quantity: number;
    type: 'purchase' | 'sale' | 'return' | 'adjustment';
    referenceId?: string;
    notes?: string;
  }>;
}

export interface AdjustInventory {
  quantityChange: number;
  operationType: "purchase" | "sale" | "return" | "adjustment";
  referenceId?: string;
  notes?: string;
}

const inventorySchemas = {
  create: Joi.object({
    productId: Joi.string().uuid().required().messages({ "string.guid": "Invalid product ID" }),
    stockQuantity: Joi.number().integer().min(0).required().messages({ "number.base": "Stock quantity must be a number" }),
    reservedQuantity: Joi.number().integer().min(0).optional(),
    reorderLevel: Joi.number().integer().min(0).optional(),
    inStock: Joi.boolean().optional(),
    stockHistory: Joi.array().items(Joi.object({
      date: Joi.date().required(),
      quantity: Joi.number().integer().required(),
      type: Joi.string().valid('purchase','sale','return','adjustment').required(),
      referenceId: Joi.string().optional(),
      notes: Joi.string().optional()
    })).optional(),
  }),

  update: Joi.object({
    stockQuantity: Joi.number().integer().min(0).optional(),
    reservedQuantity: Joi.number().integer().min(0).optional(),
    reorderLevel: Joi.number().integer().min(0).optional(),
    inStock: Joi.boolean().optional(),
    stockHistory: Joi.array().items(Joi.object({
      date: Joi.date().required(),
      quantity: Joi.number().integer().required(),
      type: Joi.string().valid('purchase','sale','return','adjustment').required(),
      referenceId: Joi.string().optional(),
      notes: Joi.string().optional()
    })).optional(),
  }),

  adjust: Joi.object<AdjustInventory>({
    quantityChange: Joi.number().integer().required(),
    operationType: Joi.string().valid("purchase", "sale", "return", "adjustment").required(),
    referenceId: Joi.string().max(255).optional(),
    notes: Joi.string().optional(),
  }),
};

export default inventorySchemas;
