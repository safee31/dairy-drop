import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { upload } from "@/middleware/upload";
import { productSchemas } from "@/models/product";
import * as productController from "@/controllers/admin/products";
import * as productImageController from "@/controllers/admin/productImages";

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// ============================================
// PRODUCT CRUD ROUTES
// ============================================

router.get("/products", productController.getAllProducts);
router.get("/products/:id", productController.getProductById);
router.post("/products", validate(productSchemas.create), productController.createProduct);
router.put("/products/:id", validate(productSchemas.update), productController.updateProduct);
router.delete("/products/:id", productController.deleteProduct);
router.patch("/products/:id/toggle-status", productController.toggleProductStatus);

// ============================================
// PRODUCT IMAGES ROUTES - Separate APIs
// ============================================

// List images
router.get("/products/:id/images", productImageController.listProductImages);

// Bulk upload images (called after product creation)
router.post(
  "/products/:id/images",
  upload.array("images", 5),
  productImageController.uploadProductImages,
);

// Add single image
router.post(
  "/products/:id/images/add",
  upload.single("image"),
  productImageController.addProductImage,
);

// Replace/update single image
router.patch(
  "/products/:id/images/:imageId",
  upload.single("image"),
  productImageController.updateProductImage,
);

// Delete single image
router.delete("/products/:id/images/:imageId", productImageController.deleteProductImage);

// Set primary image
router.patch(
  "/products/:id/images/:imageId/set-primary",
  productImageController.setProductPrimaryImage,
);

export default router;
