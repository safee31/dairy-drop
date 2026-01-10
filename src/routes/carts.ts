import { Router } from "express";
import { authenticate, requireCustomer } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { cartItemSchemas, cartSchemas } from "@/models/cart";
import * as cartController from "@/controllers/customer/carts";

const router = Router();

router.use(authenticate);
router.use(requireCustomer);

router.get("/", cartController.getCart);
router.post("/items", validate(cartItemSchemas.addToCart), cartController.addToCart);
router.put("/items/:itemId", validate(cartItemSchemas.updateCartItem), cartController.updateCartItem);
router.delete("/items/:itemId", cartController.removeCartItem);
router.post("/delivery-address", validate(cartSchemas.selectAddress), cartController.selectDeliveryAddress);

export default router;
