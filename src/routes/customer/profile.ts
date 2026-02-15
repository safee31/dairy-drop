import { Router } from "express";
import authCtrl from "@/controllers/auth";
import profileCtrl from "@/controllers/customer/profile";
import { uploadSingle } from "@/middleware/upload";
import { validate } from "@/middleware/validate";
import { userSchemas } from "@/models/user";

const router = Router();

// Auth + role middleware applied by customer/index.ts

router.get("/", authCtrl.readUser);

router.put("/", validate(userSchemas.update), profileCtrl.updateProfile);

router.post("/image", uploadSingle("file"), profileCtrl.uploadProfileImage);

router.delete("/image", profileCtrl.deleteProfileImage);

export default router;
