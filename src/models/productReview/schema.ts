import Joi from "joi";
import { ReviewStatus } from "./entity";

export class CreateReviewDTO {
  productId!: string;
  orderId?: string;
  rating!: number;
  comment!: string;
}

export class UpdateReviewStatusDTO {
  status!: ReviewStatus;
}

export class CreateReviewResponseDTO {
  responseText!: string;
}

const reviewSchemas = {
  create: Joi.object({
    productId: Joi.string().uuid().required().messages({
      "string.guid": "Valid product is required.",
    }),
    orderId: Joi.string().uuid().optional().allow(null).messages({
      "string.guid": "Valid order is required.",
    }),
    rating: Joi.number()
      .min(1)
      .max(5)
      .required()
      .custom((value, helpers) => {
        const multiplied = Math.round(value * 2);
        if (Math.abs(multiplied / 2 - value) > 0) {
          return helpers.error("any.invalid");
        }
        return value;
      })
      .messages({
        "number.base": "Rating must be a number.",
        "number.min": "Rating must be at least 1.",
        "number.max": "Rating cannot exceed 5.",
        "any.invalid": "Rating must be in 0.5 increments (e.g., 4, 4.5).",
      }),
    comment: Joi.string().min(3).max(2000).required().messages({
      "string.min": "Review must be at least 3 characters.",
      "string.max": "Review cannot exceed 2000 characters.",
    }),
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid(...Object.values(ReviewStatus))
      .required()
      .messages({
        "any.only": `Status must be one of: ${Object.values(ReviewStatus).join(", ")}`,
      }),
  }),

  createResponse: Joi.object({
    responseText: Joi.string().min(3).max(2000).required().messages({
      "string.min": "Response must be at least 3 characters.",
      "string.max": "Response cannot exceed 2000 characters.",
    }),
  }),

  update: Joi.object({
    rating: Joi.number()
      .min(1)
      .max(5)
      .optional()
      .custom((value, helpers) => {
        if (value === undefined || value === null) return value;
        const multiplied = Math.round(value * 2);
        if (Math.abs(multiplied / 2 - value) > 0) {
          return helpers.error("any.invalid");
        }
        return value;
      })
      .messages({
        "number.base": "Rating must be a number.",
        "number.min": "Rating must be at least 1.",
        "number.max": "Rating cannot exceed 5.",
        "any.invalid": "Rating must be in 0.5 increments (e.g., 4, 4.5).",
      }),
    comment: Joi.string().min(3).max(2000).optional().messages({
      "string.min": "Review must be at least 3 characters.",
      "string.max": "Review cannot exceed 2000 characters.",
    }),
  }),
};

export default reviewSchemas;
