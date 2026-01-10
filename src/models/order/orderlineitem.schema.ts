import Joi from "joi";

export class CreateOrderLineItemDTO {
  productId!: string;
  quantity!: number;
}

const orderLineItemSchemas = {
  create: Joi.object({
    productId: Joi.string()
      .uuid()
      .required()
      .messages({ "string.guid": "Valid product ID is required" }),
    quantity: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .required()
      .messages({
        "number.base": "Quantity must be a number",
        "number.min": "Minimum quantity is 1",
        "number.max": "Maximum quantity is 100",
      }),
  }),
};

export default orderLineItemSchemas;
