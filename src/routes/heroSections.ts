import { Router } from "express";
import heroSectionCtrl from "@/controllers/public/heroSections";

const router = Router();

router.get("/", heroSectionCtrl.listActiveHeroSections);
router.get("/:id", heroSectionCtrl.getHeroSectionById);

export default router;
