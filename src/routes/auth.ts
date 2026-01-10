import { Router } from "express";
import * as authController from "@/controllers/auth";
import { authenticate } from "@/middleware/auth";
import { loginRateLimiter, passwordResetRateLimiter, otpRateLimiter } from "@/middleware/rateLimiter";
import { validate } from "@/middleware/validate";
import { userSchemas } from "@/models/user";

const router = Router();

router.post("/register", validate(userSchemas.create), authController.registerCustomer);
router.post("/verify-email", otpRateLimiter, validate(userSchemas.verifyEmail), authController.verifyEmail);
router.post("/login", loginRateLimiter, validate(userSchemas.login), authController.loginCustomer);
router.post(
  "/forgot-password",
  passwordResetRateLimiter,
  authController.forgotPassword,
);
router.post("/reset-password", authController.resetPassword);
router.post("/verify-otp", otpRateLimiter, authController.verifyUserOTP);
router.post("/send-otp", otpRateLimiter, authController.sendUserOTP);

// Token refresh
router.post("/refresh", authController.refreshTokens);

// Protected routes (authentication required)
router.post("/logout", authenticate, authController.logout);
router.get("/profile", authenticate, authController.readUser);

export default router;
