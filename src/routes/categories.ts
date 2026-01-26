import { Router } from "express";
import { validate } from "@/middleware/validate";
import { categorySchemas } from "@/models/category/category.schema";
import * as categoryController from "@/controllers/public/categories";

const router = Router();

// ============================================
// PUBLIC CATEGORY ROUTES (No Auth Required)
// ============================================

router.get("/", validate(categorySchemas.list), categoryController.listCategories);
router.get("/:id", categoryController.getCategory);

export default router;
