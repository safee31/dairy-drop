import { Router } from "express";
import { validateCsrfToken } from "@/middleware/csrf";
import orderCtrl from "@/controllers/customer/orders";

const router = Router();

// Auth + role middleware applied by customer/index.ts

router.get("/", orderCtrl.listOrders);
router.post("/", validateCsrfToken, orderCtrl.createOrder);
router.get("/:id", orderCtrl.getOrder);
router.post("/:id/confirm", validateCsrfToken, orderCtrl.confirmOrder);
router.post("/:id/cancel", validateCsrfToken, orderCtrl.cancelOrder);
router.get("/:id/tracking", orderCtrl.getOrderTracking);

export default router;
