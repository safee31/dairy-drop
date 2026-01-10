import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { apiRateLimiter } from "../middleware/rateLimiter";
import { responseHandler } from "@/middleware/responseHandler";

const router = Router();

// Apply rate limiting to all user routes
router.use(apiRateLimiter);

// Get all users (Admin only)
router.get("/", authenticate, requireRole(["1"]), (_req, res) => {
  return responseHandler.success(res, {}, "Get all users - TODO");
});

// Get user profile
router.get("/profile", authenticate, (_req, res) => {
  return responseHandler.success(res, {}, "Get user profile - TODO");
});

// Update user profile
router.put("/profile", authenticate, (_req, res) => {
  // TODO: Implement update user profile
  return responseHandler.success(res, {}, "Update user profile - TODO");
});

// Get user by ID (Admin only)
router.get("/:id", authenticate, requireRole(["1"]), (_req, res) => {
  return responseHandler.success(res, {}, "Get user by ID - TODO");
});

// Update user (Admin only)
router.put("/:id", authenticate, requireRole(["1"]), (_req, res) => {
  return responseHandler.success(res, {}, "Update user - TODO");
});

// Delete user (Admin only)
router.delete("/:id", authenticate, requireRole(["1"]), (_req, res) => {
  return responseHandler.success(res, {}, "Delete user - TODO");
});

export default router;
