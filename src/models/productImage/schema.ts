import Joi from "joi";

export class UpdateProductImages {
  images!: Array<{
    imageUrl: string;
    isPrimary?: boolean;
  }>;
}

const productImageSchemas = {
  updateImages: Joi.object({
    images: Joi.array()
      .items(
        Joi.object({
          imageUrl: Joi.string()
            .uri()
            .required()
            .messages({ "string.uri": "Image URL must be valid" }),
          isPrimary: Joi.boolean().optional().default(false),
        }),
      )
      .required()
      .min(1)
      .messages({
        "array.min": "At least one image is required",
        "array.base": "Images must be an array",
      }),
  }),
};

export default productImageSchemas;
