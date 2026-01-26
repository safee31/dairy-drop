import { Router } from "express";
import * as authController from "@/controllers/auth";
import profileController from "@/controllers/customer/profile";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { uploadSingle } from "@/middleware/upload";
import { validate } from "@/middleware/validate";
import { userSchemas } from "@/models/user";
import { requireRole } from "@/middleware/roles-auth";

const router = Router();

router.use(validateLoginSession);
router.use(requireRole(['1', '2']));
// All profile routes require authentication

// Get customer profile (from auth)
router.get("/", authController.readUser);

// Update customer profile
router.put("/", validate(userSchemas.update), profileController.updateProfile);

// Upload profile image
router.post("/image", uploadSingle("file"), profileController.uploadProfileImage);

// Delete profile image
router.delete("/image", profileController.deleteProfileImage);

export default router;
