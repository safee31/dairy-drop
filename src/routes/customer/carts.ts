import { Router } from "express";
import { validate } from "@/middleware/validate";
import { cartItemSchemas, cartSchemas } from "@/models/cart";
import cartCtrl from "@/controllers/customer/carts";

const router = Router();

// Auth + role middleware applied by customer/index.ts

router.get("/", cartCtrl.getCart);
router.post("/items", validate(cartItemSchemas.addToCart), cartCtrl.addToCart);
router.put("/items/:itemId", validate(cartItemSchemas.updateCartItem), cartCtrl.updateCartItem);
router.delete("/items/:itemId", cartCtrl.removeCartItem);
router.patch("/items/:itemId/select", validate(cartItemSchemas.toggleSelect), cartCtrl.toggleSelectItem);
router.post("/delivery-address", validate(cartSchemas.selectAddress), cartCtrl.selectDeliveryAddress);

export default router;
