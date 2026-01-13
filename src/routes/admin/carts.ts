import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireAdmin } from "@/middleware/roles-auth";
import * as cartController from "@/controllers/admin/carts";

const router = Router();

router.use(validateLoginSession);
router.use(requireAdmin);

router.get("/", cartController.listCarts);
router.get("/:id", cartController.getCartById);
router.delete("/:id", cartController.deleteCart);

export default router;
