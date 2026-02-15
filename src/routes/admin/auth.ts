import { Router } from "express";
import sharedAuthCtrl from "@/controllers/shared/auth";
import authCtrl from "@/controllers/auth";
import { validateLoginSession, optionalLoginSession } from "@/middleware/validateLoginSession";
import { loginRateLimiter, passwordResetRateLimiter, otpRateLimiter } from "@/middleware/rateLimiter";
import { validate } from "@/middleware/validate";
import { userSchemas } from "@/models/user";

const router = Router();

// Admin-specific: login enforces role type 1 (admin)
router.post("/login", loginRateLimiter, validate(userSchemas.login), sharedAuthCtrl.createLoginHandler(1));

// No registration route for admin (admins are created via seed/internal only)

// Auth flows
router.post("/forgot-password", passwordResetRateLimiter, authCtrl.forgotPassword);
router.post("/reset-password", passwordResetRateLimiter, authCtrl.resetPassword);
router.post("/send-otp", otpRateLimiter, authCtrl.sendOTP);
router.post("/verify-otp", otpRateLimiter, authCtrl.verifyResetOTP);

// Session management
router.get("/validate", authCtrl.validateSession);
router.post("/refresh", authCtrl.refreshSession);
router.post("/logout", optionalLoginSession, authCtrl.logout);
router.get("/profile", validateLoginSession, authCtrl.readUser);

export default router;
