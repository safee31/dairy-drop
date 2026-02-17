import Joi from "joi";
import {
  RefundStatus,
  RefundReason,
  RefundMethod,
  RefundPaymentStatus,
} from "./entity";

export class CreateRefundDTO {
  orderId!: string;
  reason!: RefundReason;
  customerNote?: string;
  refundedItems?: { orderLineItemId: string; quantity: number }[];
  preferredRefundMethod?: RefundMethod;
  currency?: string;
}

export class UpdateRefundStatusDTO {
  status!: RefundStatus;
  adminNote?: string;
}

export class UpdateRefundPaymentDTO {
  method?: RefundMethod;
  status!: RefundPaymentStatus;
  amountPaid?: number;
  transactionId?: string;
  provider?: string;
  accountDetails?: string;
  failureReason?: string;
}

const refundSchemas = {
  create: Joi.object({
    orderId: Joi.string().uuid().required().messages({
      "string.guid": "Order ID must be a valid UUID",
      "any.required": "Order ID is required",
    }),

    reason: Joi.string()
      .valid(...Object.values(RefundReason))
      .required()
      .messages({
        "any.only": `Reason must be one of: ${Object.values(RefundReason).join(", ")}`,
        "any.required": "Refund reason is required",
      }),

    customerNote: Joi.string().trim().max(1000).optional().allow("", null),

    refundedItems: Joi.array()
      .items(
        Joi.object({
          orderLineItemId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).required(),
        }),
      )
      .min(1)
      .optional()
      .messages({
        "array.min": "At least one item is required for partial refund",
      }),

    preferredRefundMethod: Joi.string()
      .valid(...Object.values(RefundMethod))
      .optional()
      .messages({
        "any.only": `Refund method must be one of: ${Object.values(RefundMethod).join(", ")}`,
      }),

    currency: Joi.string()
      .trim()
      .uppercase()
      .length(3)
      .optional()
      .default("PKR")
      .messages({
        "string.length": "Currency must be a 3-letter ISO 4217 code (e.g., PKR, USD)",
      }),
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid(
        RefundStatus.APPROVED,
        RefundStatus.REJECTED,
        RefundStatus.COMPLETED,
        RefundStatus.FAILED,
      )
      .required()
      .messages({
        "any.only": `Status must be one of: ${[RefundStatus.APPROVED, RefundStatus.REJECTED, RefundStatus.COMPLETED, RefundStatus.FAILED].join(", ")}`,
      }),

    adminNote: Joi.string().trim().max(1000).optional().allow("", null),
  }),

  updatePayment: Joi.object({
    method: Joi.string()
      .valid(...Object.values(RefundMethod))
      .optional()
      .messages({
        "any.only": `Refund method must be one of: ${Object.values(RefundMethod).join(", ")}`,
      }),

    status: Joi.string()
      .valid(...Object.values(RefundPaymentStatus))
      .required()
      .messages({
        "any.only": `Payment status must be one of: ${Object.values(RefundPaymentStatus).join(", ")}`,
      }),

    amountPaid: Joi.number().positive().precision(2).optional(),

    transactionId: Joi.string().trim().max(255).optional().allow("", null),

    provider: Joi.string().trim().max(50).optional().allow("", null),

    accountDetails: Joi.string().trim().max(255).optional().allow("", null),

    failureReason: Joi.string().trim().max(500).optional().allow("", null),
  }),

  list: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    status: Joi.string()
      .valid(...Object.values(RefundStatus))
      .optional(),
  }),
};

export default refundSchemas;
