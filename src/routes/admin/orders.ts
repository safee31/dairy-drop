import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { orderSchemas } from "@/models/order";
import * as orderController from "@/controllers/admin/orders";

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get("/orders", orderController.listAllOrders);
router.get("/orders/:id", orderController.getOrderDetails);
router.patch("/orders/:id/status", validate(orderSchemas.updateStatus), orderController.updateOrderStatus);
router.patch("/orders/:id/payment", validate(orderSchemas.updatePayment), orderController.updatePaymentStatus);
router.post("/orders/:id/cancel", orderController.cancelOrderAdmin);
router.get("/orders/:id/delivery-history", orderController.getDeliveryHistory);

export default router;
