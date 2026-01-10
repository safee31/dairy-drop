import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { categorySchemas } from "@/models/category/category.schema";
import { categoryLevel1Schemas } from "@/models/category/category-level1.schema";
import { categoryLevel2Schemas } from "@/models/category/category-level2.schema";
import * as categoryController from "@/controllers/admin/categories";

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// ============================================
// ROOT CATEGORY ROUTES
// ============================================

router.get("/categories", validate(categorySchemas.list), categoryController.getAllCategories);
router.get("/categories/:id", categoryController.getCategoryById);
router.post("/categories", validate(categorySchemas.create), categoryController.createCategory);
router.put("/categories/:id", validate(categorySchemas.update), categoryController.updateCategory);
router.delete("/categories/:id", categoryController.deleteCategory);
router.patch("/categories/:id/toggle-status", categoryController.toggleCategoryStatus);

// ============================================
// CATEGORY LEVEL 1 ROUTES
// ============================================

router.get(
  "/category-level1",
  validate(categoryLevel1Schemas.list),
  categoryController.getAllCategoryLevel1,
);
router.get("/category-level1/:id", categoryController.getCategoryLevel1ById);
router.post(
  "/category-level1",
  validate(categoryLevel1Schemas.create),
  categoryController.createCategoryLevel1,
);
router.put(
  "/category-level1/:id",
  validate(categoryLevel1Schemas.update),
  categoryController.updateCategoryLevel1,
);
router.delete("/category-level1/:id", categoryController.deleteCategoryLevel1);
router.patch("/category-level1/:id/toggle-status", categoryController.toggleCategoryLevel1Status);

// ============================================
// CATEGORY LEVEL 2 ROUTES
// ============================================

router.get(
  "/category-level2",
  validate(categoryLevel2Schemas.list),
  categoryController.getAllCategoryLevel2,
);
router.get("/category-level2/:id", categoryController.getCategoryLevel2ById);
router.post(
  "/category-level2",
  validate(categoryLevel2Schemas.create),
  categoryController.createCategoryLevel2,
);
router.put(
  "/category-level2/:id",
  validate(categoryLevel2Schemas.update),
  categoryController.updateCategoryLevel2,
);
router.delete("/category-level2/:id", categoryController.deleteCategoryLevel2);
router.patch(
  "/category-level2/:id/toggle-status",
  categoryController.toggleCategoryLevel2Status,
);

export default router;
