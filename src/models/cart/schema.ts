import Joi from "joi";

export class SelectCartAddressDTO {
  addressId?: string;
  address?: {
    fullName: string;
    phoneNumber?: string | null;
    streetAddress: string;
    apartment?: string | null;
    city: string;
    state?: string | null;
    postalCode: string;
    country: string;
  };
}

const cartSchemas = {
  selectAddress: Joi.object({
    addressId: Joi.string()
      .uuid()
      .optional()
      .messages({ "string.guid": "Valid address ID is required" }),
    address: Joi.object({
      fullName: Joi.string().min(2).max(100).required(),
      phoneNumber: Joi.string()
        .pattern(/^[0-9+\-\s()]{10,15}$/)
        .optional()
        .allow(null),
      streetAddress: Joi.string().min(5).max(255).required(),
      apartment: Joi.string().max(100).optional().allow(null),
      city: Joi.string().min(2).max(100).required(),
      state: Joi.string().max(100).optional().allow(null),
      postalCode: Joi.string().min(3).max(20).required(),
      country: Joi.string().min(2).max(100).required(),
    }).when("addressId", {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.required(),
    }),
  }),
};

export default cartSchemas;
