import { Router } from "express";
import sharedAuthCtrl from "@/controllers/shared/auth";
import authCtrl from "@/controllers/auth";
import { validateLoginSession, optionalLoginSession } from "@/middleware/validateLoginSession";
import { loginRateLimiter, passwordResetRateLimiter, otpRateLimiter } from "@/middleware/rateLimiter";
import { validate } from "@/middleware/validate";
import { userSchemas } from "@/models/user";

const router = Router();

// Customer-specific: login enforces role type 2 (customer)
router.post("/login", loginRateLimiter, validate(userSchemas.login), sharedAuthCtrl.createLoginHandler(2));

// Customer-only: registration
router.post("/register", validate(userSchemas.create), authCtrl.registerCustomer);

// Auth flows
router.post("/verify-email", otpRateLimiter, validate(userSchemas.verifyEmail), authCtrl.verifyEmail);
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
