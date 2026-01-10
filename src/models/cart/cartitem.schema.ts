import Joi from "joi";

export class AddToCartDTO {
  productId!: string;
  quantity!: number;
}

export class UpdateCartItemDTO {
  quantity!: number;
}

const cartItemSchemas = {
  addToCart: Joi.object({
    productId: Joi.string()
      .uuid()
      .required()
      .messages({ "string.guid": "Valid product ID is required" }),
    quantity: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .required()
      .messages({
        "number.base": "Quantity must be a number",
        "number.min": "Minimum quantity is 1",
        "number.max": "Maximum quantity is 50",
      }),
  }),

  updateCartItem: Joi.object({
    quantity: Joi.number()
      .integer()
      .min(0)
      .max(50)
      .required()
      .messages({
        "number.base": "Quantity must be a number",
        "number.min": "Quantity cannot be negative",
        "number.max": "Maximum quantity is 50",
      }),
  }),
};

export default cartItemSchemas;
