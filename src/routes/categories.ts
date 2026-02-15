import { Router } from "express";
import { validate } from "@/middleware/validate";
import { categorySchemas } from "@/models/category/category.schema";
import categoryCtrl from "@/controllers/public/categories";

const router = Router();

// ============================================
// PUBLIC CATEGORY ROUTES (No Auth Required)
// ============================================

router.get("/", validate(categorySchemas.list), categoryCtrl.listCategories);
router.get("/:id", categoryCtrl.getCategory);

export default router;
