import Joi from "joi";
import { OrderStatus, PaymentStatus, DeliveryStatus } from "./entity";

export class CreateOrderDTO {
  deliveryAddress!: {
    fullName: string;
    phoneNumber?: string | null;
    streetAddress: string;
    apartment?: string | null;
    city: string;
    state?: string | null;
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
      fullName: Joi.string().trim().min(1).max(100).required().messages({
        "string.empty": "Full name is required",
      }),
      phoneNumber: Joi.string()
        .trim()
        .pattern(/^(\+92|0)?[3][0-9]{2}[0-9]{7}$/)
        .optional()
        .allow(null, "")
        .messages({
          "string.pattern.base": "Please provide a valid phone number",
        }),
      streetAddress: Joi.string().trim().min(5).max(255).required().messages({
        "string.empty": "Street address is required",
      }),
      apartment: Joi.string().trim().max(50).optional().allow(null, ""),
      city: Joi.string().trim().min(2).max(100).required().messages({
        "string.empty": "City is required",
      }),
      state: Joi.string().trim().max(100).optional().allow(null, ""),
      postalCode: Joi.string().trim().min(2).max(20).required().messages({
        "string.empty": "Postal code is required",
      }),
      country: Joi.string().trim().min(2).max(100).required().messages({
        "string.empty": "Country is required",
      }),
      instructions: Joi.string().trim().max(500).optional().allow(null, ""),
    }).required(),

    customerNote: Joi.string().max(1000).allow("").optional(),

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

    notes: Joi.string().max(500).optional().allow("", null),
  }),

  updatePayment: Joi.object({
    status: Joi.string()
      .valid(...Object.values(PaymentStatus))
      .required(),

    collectedBy: Joi.string().min(2).max(100).optional(),

    amountPaid: Joi.number().positive().precision(2).optional(),
  }),

  updateDeliveryStatus: Joi.object({
    newDeliveryStatus: Joi.string()
      .valid(...Object.values(DeliveryStatus))
      .required()
      .messages({
        "any.only": `Delivery status must be one of: ${Object.values(DeliveryStatus).join(", ")}`,
      }),

    deliveryPersonName: Joi.string().min(2).max(100).optional().allow("", null),

    deliveryPersonPhone: Joi.string()
      .trim()
      .pattern(/^(\+92|0)?[3][0-9]{2}[0-9]{7}$/)
      .optional()
      .allow("", null)
      .messages({
        "string.pattern.base": "Please provide a valid phone number",
      }),

    location: Joi.string().max(100).optional().allow("", null),

    notes: Joi.string().max(500).optional().allow("", null),
  }),

  cancel: Joi.object({
    reason: Joi.string().min(5).max(500).required(),
    cancelledBy: Joi.string().valid("customer", "admin").required(),
  }),
};

export default orderSchemas;
