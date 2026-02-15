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
    }).when("addressId", {
      is: Joi.exist(),
      then: Joi.forbidden(),
      otherwise: Joi.required(),
    }),
  }),
};

export default cartSchemas;
