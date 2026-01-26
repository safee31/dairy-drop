import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireAdmin } from "@/middleware/roles-auth";
import { validate } from "@/middleware/validate";
import { categorySchemas } from "@/models/category/category.schema";
import { categoryLevel1Schemas } from "@/models/category/category-level1.schema";
import { categoryLevel2Schemas } from "@/models/category/category-level2.schema";
import categoryController from "@/controllers/admin/categories";

const router = Router();

router.use(validateLoginSession);
router.use(requireAdmin);

// ============================================
// CATEGORY LEVEL 1 ROUTES (before /:id catch-all)
// ============================================

router.get(
  "/level1",
  validate(categoryLevel1Schemas.list),
  categoryController.getAllCategoryLevel1,
);
router.get("/level1/:id", categoryController.getCategoryLevel1ById);
router.post(
  "/level1",
  validate(categoryLevel1Schemas.create),
  categoryController.createCategoryLevel1,
);
router.put(
  "/level1/:id",
  validate(categoryLevel1Schemas.update),
  categoryController.updateCategoryLevel1,
);
router.delete("/level1/:id", categoryController.deleteCategoryLevel1);
router.patch("/level1/:id/toggle-status", categoryController.toggleCategoryLevel1Status);

// ============================================
// CATEGORY LEVEL 2 ROUTES (before /:id catch-all)
// ============================================

router.get(
  "/level2",
  validate(categoryLevel2Schemas.list),
  categoryController.getAllCategoryLevel2,
);
router.get("/level2/:id", categoryController.getCategoryLevel2ById);
router.post(
  "/level2",
  validate(categoryLevel2Schemas.create),
  categoryController.createCategoryLevel2,
);
router.put(
  "/level2/:id",
  validate(categoryLevel2Schemas.update),
  categoryController.updateCategoryLevel2,
);
router.delete("/level2/:id", categoryController.deleteCategoryLevel2);
router.patch(
  "/level2/:id/toggle-status",
  categoryController.toggleCategoryLevel2Status,
);

// ============================================
// ROOT CATEGORY ROUTES (after specific routes)
// ============================================

router.get("/", validate(categorySchemas.list), categoryController.getAllCategories);
router.post("/", validate(categorySchemas.create), categoryController.createCategory);
router.get("/:id", categoryController.getCategoryById);
router.put("/:id", validate(categorySchemas.update), categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);
router.patch("/:id/toggle-status", categoryController.toggleCategoryStatus);

export default router;
