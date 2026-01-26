import Joi from "joi";

export class CreateHeroSectionDTO {
  title!: string;
  description!: string;
  imageUrl!: string;
  imageAlt?: string;
  cta!: {
    text: string;
    link: string;
  };
  displayOrder!: number;
  isActive?: boolean;
}

export class UpdateHeroSectionDTO {
  title?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  cta?: {
    text: string;
    link: string;
  };
  displayOrder?: number;
  isActive?: boolean;
}

const heroSectionSchemas = {
  create: Joi.object({
    title: Joi.string()
      .min(3)
      .max(200)
      .required()
      .messages({
        "string.empty": "Title is required",
        "string.min": "Title must be at least 3 characters",
      }),

    description: Joi.string()
      .min(10)
      .max(1000)
      .required()
      .messages({
        "string.empty": "Description is required",
        "string.min": "Description must be at least 10 characters",
      }),

    imageUrl: Joi.string()
      .uri()
      .required()
      .messages({
        "string.uri": "Valid image URL is required",
      }),

    imageAlt: Joi.string()
      .max(100)
      .optional(),

    cta: Joi.object({
      text: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({ "string.empty": "CTA text is required" }),
      link: Joi.string()
        .uri()
        .required()
        .messages({ "string.uri": "Valid CTA link is required" }),
    })
      .required()
      .messages({ "object.base": "CTA must be an object with text and link" }),

    displayOrder: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({ "number.base": "Display order must be a number" }),

    isActive: Joi.boolean()
      .default(true)
      .optional(),
  }),

  update: Joi.object({
    title: Joi.string()
      .min(3)
      .max(200)
      .optional(),

    description: Joi.string()
      .min(10)
      .max(1000)
      .optional(),

    imageUrl: Joi.string()
      .uri()
      .optional(),

    imageAlt: Joi.string()
      .max(100)
      .optional(),

    cta: Joi.object({
      text: Joi.string()
        .min(2)
        .max(50)
        .required(),
      link: Joi.string()
        .uri()
        .required(),
    })
      .optional(),

    displayOrder: Joi.number()
      .integer()
      .min(0)
      .optional(),

    isActive: Joi.boolean()
      .optional(),
  })
    .min(1)
    .messages({ "object.min": "At least one field must be provided for update" }),
};

export default heroSectionSchemas;
