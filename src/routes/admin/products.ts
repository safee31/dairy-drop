import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireAdmin } from "@/middleware/roles-auth";
import { validate } from "@/middleware/validate";
import { upload } from "@/middleware/upload";
import { productSchemas } from "@/models/product";
import * as productController from "@/controllers/admin/products";
import * as productImageController from "@/controllers/admin/productImages";

const router = Router();

router.use(validateLoginSession);
router.use(requireAdmin);

// ============================================
// PRODUCT CRUD ROUTES
// ============================================

router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.post("/", validate(productSchemas.create), productController.createProduct);
router.put("/:id", validate(productSchemas.update), productController.updateProduct);
router.delete("/:id", productController.deleteProduct);
router.patch("/:id/toggle-status", productController.toggleProductStatus);

// ============================================
// PRODUCT IMAGES ROUTES - Separate APIs
// ============================================

// List images
router.get("/:id/images", productImageController.listProductImages);

// Bulk upload images (called after product creation)
router.post(
  "/:id/images",
  upload.array("images", 5),
  productImageController.uploadProductImages,
);

// Add single image
router.post(
  "/:id/images/add",
  upload.single("image"),
  productImageController.addProductImage,
);

// Replace/update single image
router.patch(
  "/:id/images/:imageId",
  upload.single("image"),
  productImageController.updateProductImage,
);

// Delete single image
router.delete("/:id/images/:imageId", productImageController.deleteProductImage);

// Set primary image
router.patch(
  "/:id/images/:imageId/set-primary",
  productImageController.setProductPrimaryImage,
);

export default router;
