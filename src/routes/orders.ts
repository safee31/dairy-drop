import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireCustomer } from "@/middleware/roles-auth";
import { validate } from "@/middleware/validate";
import { validateCsrfToken } from "@/middleware/csrf";
import { orderSchemas } from "@/models/order";
import * as orderController from "@/controllers/customer/orders";

const router = Router();

router.use(validateLoginSession);
router.use(requireCustomer);

router.get("/", orderController.listOrders);
router.post("/", validateCsrfToken, validate(orderSchemas.create), orderController.createOrder);
router.get("/:id", orderController.getOrder);
router.post("/:id/cancel", validateCsrfToken, validate(orderSchemas.cancel), orderController.cancelOrder);
router.get("/:id/tracking", orderController.getOrderTracking);

export default router;
