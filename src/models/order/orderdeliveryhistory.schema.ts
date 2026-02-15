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

  updatePayment: Joi.object({
    status: Joi.string()
      .valid(...Object.values(PaymentStatus))
      .required(),

    collectedBy: Joi.string().min(2).max(100).optional(),

    amountPaid: Joi.number().positive().precision(2).optional(),
  }),
};

export default orderDeliveryHistorySchemas;
