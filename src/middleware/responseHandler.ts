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
   * @param {Object} res - Express response object
   * @param {string} message - Error message (default: "An error occurred")
   * @param {number} status - HTTP status code (default: 500)
   * @param {Object|null} details - Additional error details (optional)
   */
  error: (
    res: Response,
    message: string = "An error occurred",
    status: number = 500,
    details: Record<string, unknown> | null = null,
  ) => {
    const response: Record<string, unknown> = { success: false, message };
    if (details) {
      response.details = details;
    }
    res.status(status).json(response);
  },

  /**
   * Handles 404 Not Found responses.
   * @param {Object} res - Express response object
   * @param {string} message - Not found message (default: "Resource not found")
   */
  notFound: (res: Response, message: string = "Resource not found") => {
    responseHandler.error(res, message, 404);
  },

  /**
   * Handles 401 Unauthorized responses.
   * @param {Object} res - Express response object
   * @param {string} message - Unauthorized message (default: "Unauthorized access")
   */
  unauthorized: (res: Response, message: string = "Unauthorized access") => {
    responseHandler.error(res, message, 401);
  },

  /**
   * Handles 403 Forbidden responses.
   * @param {Object} res - Express response object
   * @param {string} message - Forbidden message (default: "Access forbidden")
   */
  forbidden: (res: Response, message: string = "Access forbidden") => {
    responseHandler.error(res, message, 403);
  },
};
