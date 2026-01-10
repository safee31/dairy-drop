import { Router } from "express";
import * as productController from "@/controllers/public/products";

const router = Router();

// Public product endpoints
router.get("/", productController.listProducts);
router.get("/:id", productController.getProduct);

export default router;
