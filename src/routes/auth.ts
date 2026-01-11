import { Router } from "express";
import * as authController from "@/controllers/auth";
import { validateLoginSession, optionalLoginSession } from "@/middleware/validateLoginSession";
import { loginRateLimiter, passwordResetRateLimiter, otpRateLimiter } from "@/middleware/rateLimiter";
import { validate } from "@/middleware/validate";
import { userSchemas } from "@/models/user";

const router = Router();

// Public routes
router.post("/register", validate(userSchemas.create), authController.registerCustomer);
router.post("/verify-email", otpRateLimiter, validate(userSchemas.verifyEmail), authController.verifyEmail);
router.post("/login", loginRateLimiter, validate(userSchemas.login), authController.loginCustomer);
router.post("/forgot-password", passwordResetRateLimiter, authController.forgotPassword);
router.post("/reset-password", passwordResetRateLimiter, authController.resetPassword);
router.post("/send-otp", otpRateLimiter, authController.sendOTP);

// Validate session (check if session is still valid)
router.get("/validate", authController.validateSession);

// Refresh session (extend expiry)
router.post("/refresh", authController.refreshSession);

// Protected routes (authentication required)
router.post("/logout", optionalLoginSession, authController.logout);
router.get("/profile", validateLoginSession, authController.readUser);

export default router;
