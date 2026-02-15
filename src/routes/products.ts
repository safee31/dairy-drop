import { Router } from "express";
import productCtrl from "@/controllers/public/products";

const router = Router();

// Public product endpoints
router.get("/popular", productCtrl.getPopularProducts);
router.get("/", productCtrl.listProducts);
router.get("/:id", productCtrl.getProduct);

export default router;
