import Joi from "joi";
import { OrderStatus, PaymentStatus } from "./entity";

export class CreateOrderDTO {
  deliveryAddress!: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    instructions?: string;
  };
  customerNote?: string;
  items!: Array<{
    productId: string;
    quantity: number;
  }>;
}

export class UpdateOrderStatusDTO {
  status!: OrderStatus;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  location?: string;
  notes?: string;
}

export class UpdatePaymentDTO {
  status!: PaymentStatus;
  collectedBy?: string;
  amountPaid?: number;
}

export class CancelOrderDTO {
  reason!: string;
  cancelledBy!: "customer" | "admin";
}

const orderSchemas = {
  create: Joi.object({
    deliveryAddress: Joi.object({
      fullName: Joi.string().min(2).max(100).required(),
      phone: Joi.string()
        .pattern(/^[0-9+\-\s()]{10,15}$/)
        .required()
        .messages({
          "string.pattern.base": "Phone number must be 10-15 digits",
        }),
      addressLine1: Joi.string().min(5).max(255).required(),
      addressLine2: Joi.string().max(255).optional(),
      city: Joi.string().min(2).max(100).required(),
      state: Joi.string().min(2).max(100).required(),
      postalCode: Joi.string().min(3).max(20).required(),
      country: Joi.string().min(2).max(100).required(),
      instructions: Joi.string().max(500).optional(),
    }).required(),

    customerNote: Joi.string().max(1000).optional(),

    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).max(100).required(),
        }),
      )
      .min(1)
      .required()
      .messages({
        "array.min": "At least one item is required",
        "array.base": "Items must be an array",
      }),
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid(...Object.values(OrderStatus))
      .required()
      .messages({
        "any.only": `Status must be one of: ${Object.values(OrderStatus).join(", ")}`,
      }),

    deliveryPersonName: Joi.string().min(2).max(100).optional(),

    deliveryPersonPhone: Joi.string()
      .pattern(/^[0-9+\-\s()]{10,15}$/)
      .optional()
      .messages({
        "string.pattern.base": "Phone number must be 10-15 digits",
      }),

    location: Joi.string().max(100).optional(),

    notes: Joi.string().max(500).optional(),
  }),

  updatePayment: Joi.object({
    status: Joi.string()
      .valid(...Object.values(PaymentStatus))
      .required(),

    collectedBy: Joi.string().min(2).max(100).optional(),

    amountPaid: Joi.number().positive().precision(2).optional(),
  }),

  cancel: Joi.object({
    reason: Joi.string().min(5).max(500).required(),
    cancelledBy: Joi.string().valid("customer", "admin").required(),
  }),
};

export default orderSchemas;
