import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { AppError } from "@/middleware/errorHandler";

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return next(new AppError(errors[0], 400));
    }

    req.body = value;
    next();
  };
};

