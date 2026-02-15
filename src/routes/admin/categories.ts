import { Router } from "express";
import { validate } from "@/middleware/validate";
import { categorySchemas } from "@/models/category/category.schema";
import { categoryLevel1Schemas } from "@/models/category/category-level1.schema";
import { categoryLevel2Schemas } from "@/models/category/category-level2.schema";
import categoryCtrl from "@/controllers/admin/categories";

const router = Router();

// Auth + role middleware applied by admin/index.ts

// ============================================
// CATEGORY LEVEL 1 ROUTES (before /:id catch-all)
// ============================================

router.get(
  "/level1",
  validate(categoryLevel1Schemas.list),
  categoryCtrl.getAllCategoryLevel1,
);
router.get("/level1/:id", categoryCtrl.getCategoryLevel1ById);
router.post(
  "/level1",
  validate(categoryLevel1Schemas.create),
  categoryCtrl.createCategoryLevel1,
);
router.put(
  "/level1/:id",
  validate(categoryLevel1Schemas.update),
  categoryCtrl.updateCategoryLevel1,
);
router.delete("/level1/:id", categoryCtrl.deleteCategoryLevel1);
router.patch("/level1/:id/toggle-status", categoryCtrl.toggleCategoryLevel1Status);

// ============================================
// CATEGORY LEVEL 2 ROUTES (before /:id catch-all)
// ============================================

router.get(
  "/level2/hierarchy",
  validate(categoryLevel2Schemas.list),
  categoryCtrl.listCategoryLevel2Hierarchy,
);
router.get(
  "/level2",
  validate(categoryLevel2Schemas.list),
  categoryCtrl.getAllCategoryLevel2,
);
router.get("/level2/:id", categoryCtrl.getCategoryLevel2ById);
router.post(
  "/level2",
  validate(categoryLevel2Schemas.create),
  categoryCtrl.createCategoryLevel2,
);
router.put(
  "/level2/:id",
  validate(categoryLevel2Schemas.update),
  categoryCtrl.updateCategoryLevel2,
);
router.delete("/level2/:id", categoryCtrl.deleteCategoryLevel2);
router.patch(
  "/level2/:id/toggle-status",
  categoryCtrl.toggleCategoryLevel2Status,
);

// ============================================
// ROOT CATEGORY ROUTES (after specific routes)
// ============================================

router.get("/", validate(categorySchemas.list), categoryCtrl.getAllCategories);
router.post("/", validate(categorySchemas.create), categoryCtrl.createCategory);
router.get("/:id", categoryCtrl.getCategoryById);
router.put("/:id", validate(categorySchemas.update), categoryCtrl.updateCategory);
router.delete("/:id", categoryCtrl.deleteCategory);
router.patch("/:id/toggle-status", categoryCtrl.toggleCategoryStatus);

export default router;
