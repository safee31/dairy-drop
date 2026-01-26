import { Router } from "express";
import * as heroSectionController from "@/controllers/public/heroSections";

const router = Router();

router.get("/", heroSectionController.listActiveHeroSections);
router.get("/:id", heroSectionController.getHeroSectionById);

export default router;
