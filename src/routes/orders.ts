import { Router } from "express";
import { authenticate, requireCustomer } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { validateCsrfToken } from "@/middleware/csrf";
import { orderSchemas } from "@/models/order";
import * as orderController from "@/controllers/customer/orders";

const router = Router();

router.use(authenticate);
router.use(requireCustomer);

router.get("/", orderController.listOrders);
router.post("/", validateCsrfToken, validate(orderSchemas.create), orderController.createOrder);
router.get("/:id", orderController.getOrder);
router.post("/:id/cancel", validateCsrfToken, validate(orderSchemas.cancel), orderController.cancelOrder);
router.get("/:id/tracking", orderController.getOrderTracking);

export default router;
