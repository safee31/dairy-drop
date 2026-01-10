import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import * as cartController from "@/controllers/admin/carts";

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get("/carts", cartController.listCarts);
router.get("/carts/:id", cartController.getCartById);
router.delete("/carts/:id", cartController.deleteCart);

export default router;
