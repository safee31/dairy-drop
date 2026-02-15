import { Router } from "express";
import { validate } from "@/middleware/validate";
import { upload } from "@/middleware/upload";
import { productSchemas } from "@/models/product";
import productCtrl from "@/controllers/admin/products";
import productImageCtrl from "@/controllers/admin/productImages";

const router = Router();

// Auth + role middleware applied by admin/index.ts

// ============================================
// PRODUCT CRUD ROUTES
// ============================================

router.get("/", productCtrl.getAllProducts);
router.get("/:id", productCtrl.getProductById);
router.post("/", validate(productSchemas.create), productCtrl.createProduct);
router.put("/:id", validate(productSchemas.update), productCtrl.updateProduct);
router.delete("/:id", productCtrl.deleteProduct);
router.patch("/:id/toggle-status", productCtrl.toggleProductStatus);

// ============================================
// PRODUCT IMAGES ROUTES - Separate APIs
// ============================================

// Bulk upload images (called after product creation)
router.post(
  "/:id/images",
  upload.array("images", 5),
  productImageCtrl.uploadProductImages,
);

router.post(
  "/:id/images/add",
  upload.single("image"),
  productImageCtrl.addProductImage,
);

router.patch(
  "/:id/images/:imageId",
  upload.single("image"),
  productImageCtrl.updateProductImage,
);

router.delete("/:id/images/:imageId", productImageCtrl.deleteProductImage);

router.patch(
  "/:id/images/:imageId/set-primary",
  productImageCtrl.setProductPrimaryImage,
);

export default router;
