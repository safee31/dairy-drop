import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireAdmin } from "@/middleware/roles-auth";
import { validate } from "@/middleware/validate";
import { orderSchemas } from "@/models/order";
import * as orderController from "@/controllers/admin/orders";

const router = Router();

router.use(validateLoginSession);
router.use(requireAdmin);

router.get("/", orderController.listAllOrders);
router.get("/:id", orderController.getOrderDetails);
router.patch("/:id/status", validate(orderSchemas.updateStatus), orderController.updateOrderStatus);
router.patch("/:id/delivery-status", orderController.updateDeliveryStatus);
router.patch("/:id/payment", validate(orderSchemas.updatePayment), orderController.updatePaymentStatus);
router.post("/:id/cancel", orderController.cancelOrderAdmin);
router.get("/:id/delivery-history", orderController.getDeliveryHistory);

export default router;
