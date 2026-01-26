import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { AppError } from "@/middleware/errorHandler";

export const validate = (schema: Joi.ObjectSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const value = await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      req.body = value;
      next();
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const errors = error.details.map((detail) => detail.message);
        return next(new AppError(errors[0], 400));
      }
      next(error);
    }
  };
};

