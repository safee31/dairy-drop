import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireCustomer } from "@/middleware/roles-auth";
import { validateCsrfToken } from "@/middleware/csrf";
import * as orderController from "@/controllers/customer/orders";

const router = Router();

router.use(validateLoginSession);
router.use(requireCustomer);

router.get("/", orderController.listOrders);
router.post("/", validateCsrfToken, orderController.createOrder);
router.get("/:id", orderController.getOrder);
router.post("/:id/confirm", validateCsrfToken, orderController.confirmOrder);
router.post("/:id/cancel", validateCsrfToken, orderController.cancelOrder);
router.get("/:id/tracking", orderController.getOrderTracking);

export default router;
