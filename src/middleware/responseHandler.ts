// Import existing response handler
import { Response } from "express";

export const responseHandler = {
  /**
   * Handles successful responses.
   * @param {Object} res - Express response object
   * @param {Object} data - Response data (default: empty object)
   * @param {string} message - Success message (default: "Success")
   * @param {number} status - HTTP status code (default: 200)
   */
  success: (
    res: Response,
    data: Record<string, unknown> | any = {},
    message: string = "Success",
    status: number = 200,
  ) => {
    res.status(status).json({ success: true, message, data });
  },

  /**
   * Handles error responses.
   * Accepts either a plain string or an AuthError object { code, message }
   */
  error: (
    res: Response,
    messageOrError: string | { code: string; message: string } = "An error occurred",
    status: number = 500,
    details: Record<string, unknown> | null = null,
  ) => {
    const message = typeof messageOrError === "object" ? messageOrError.message : messageOrError;
    const code = typeof messageOrError === "object" ? messageOrError.code : undefined;
    const response: Record<string, unknown> = { success: false, message };
    if (code) response.code = code;
    if (details) response.details = details;
    res.status(status).json(response);
  },

  notFound: (res: Response, messageOrError: string | { code: string; message: string } = "Resource not found") => {
    responseHandler.error(res, messageOrError, 404);
  },

  unauthorized: (res: Response, messageOrError: string | { code: string; message: string } = "Unauthorized access") => {
    responseHandler.error(res, messageOrError, 401);
  },

  forbidden: (res: Response, messageOrError: string | { code: string; message: string } = "Access forbidden") => {
    responseHandler.error(res, messageOrError, 403);
  },
};
