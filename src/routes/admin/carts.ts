import { Router } from "express";
import cartCtrl from "@/controllers/admin/carts";

const router = Router();

// Auth + role middleware applied by admin/index.ts

router.get("/", cartCtrl.listCarts);
router.get("/:id", cartCtrl.getCartById);
router.delete("/:id", cartCtrl.deleteCart);

export default router;
