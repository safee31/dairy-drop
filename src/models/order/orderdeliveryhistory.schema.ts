import Joi from "joi";
import { OrderStatus, PaymentStatus } from "./entity";

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

const orderDeliveryHistorySchemas = {
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
};

export default orderDeliveryHistorySchemas;
