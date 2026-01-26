import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireAdmin } from "@/middleware/roles-auth";
import { uploadSingle } from "@/middleware/upload";
import * as heroSectionController from "@/controllers/admin/heroSections";

const router = Router();

router.use(validateLoginSession);
router.use(requireAdmin);

router.get("/", heroSectionController.getAllHeroSections);
router.get("/:id", heroSectionController.getHeroSectionById);

router.post(
  "/",
  uploadSingle("image"),
  heroSectionController.createHeroSection,
);

router.put(
  "/:id",
  uploadSingle("image"),
  heroSectionController.updateHeroSection,
);

router.delete("/:id", heroSectionController.deleteHeroSection);
router.patch("/:id/toggle-status", heroSectionController.toggleHeroSectionStatus);

export default router;
