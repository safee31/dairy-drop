import { Router } from "express";
import { uploadSingle } from "@/middleware/upload";
import { validate } from "@/middleware/validate";
import { heroSectionSchemas } from "@/models/heroSection";
import heroSectionCtrl from "@/controllers/admin/heroSections";

const router = Router();

// Auth + role middleware applied by admin/index.ts

router.get("/", heroSectionCtrl.getAllHeroSections);
router.get("/:id", heroSectionCtrl.getHeroSectionById);
router.post("/", validate(heroSectionSchemas.create), heroSectionCtrl.createHeroSection);
router.put("/:id", validate(heroSectionSchemas.update), heroSectionCtrl.updateHeroSection);
router.post("/:id/image", uploadSingle("image"), heroSectionCtrl.uploadHeroImage);
router.delete("/:id", heroSectionCtrl.deleteHeroSection);
router.patch("/:id/toggle-status", heroSectionCtrl.toggleHeroSectionStatus);

export default router;
