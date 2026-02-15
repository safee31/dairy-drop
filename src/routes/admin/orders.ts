import { Router } from "express";
import { validate } from "@/middleware/validate";
import { orderSchemas } from "@/models/order";
import orderCtrl from "@/controllers/admin/orders";

const router = Router();

// Auth + role middleware applied by admin/index.ts

router.get("/", orderCtrl.listAllOrders);
router.get("/:id", orderCtrl.getOrderDetails);
router.patch("/:id/status", validate(orderSchemas.updateStatus), orderCtrl.updateOrderStatus);
router.patch("/:id/delivery-status", validate(orderSchemas.updateDeliveryStatus), orderCtrl.updateDeliveryStatus);
router.patch("/:id/payment", validate(orderSchemas.updatePayment), orderCtrl.updatePaymentStatus);
router.post("/:id/confirm", orderCtrl.confirmOrderAdmin);
router.post("/:id/cancel", orderCtrl.cancelOrderAdmin);
router.get("/:id/delivery-history", orderCtrl.getDeliveryHistory);

export default router;
