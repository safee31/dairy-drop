import { Router } from "express";
import * as authController from "@/controllers/auth";
import { authenticate } from "@/middleware/auth";
import { loginRateLimiter, passwordResetRateLimiter } from "@/middleware/rateLimiter";

const router = Router();

// Public routes (no authentication required)
router.post("/register", authController.registerCustomer);
router.post("/verify-email", authController.verifyEmail);
router.post("/login", loginRateLimiter, authController.loginCustomer);
router.post(
  "/forgot-password",
  passwordResetRateLimiter,
  authController.forgotPassword,
);
router.post("/reset-password", authController.resetPassword);
router.post("/verify-otp", authController.verifyUserOTP);
router.post("/send-otp", authController.sendUserOTP);

// Token refresh
router.post("/refresh", authController.refreshTokens);

// Protected routes (authentication required)
router.post("/logout", authenticate, authController.logout);
router.get("/profile", authenticate, authController.readUser);

export default router;
