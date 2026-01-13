import { Router } from "express";
import authRoutes from "./auth";
import addressRoutes from "./addresses";
import adminRoutes from "./admin";
import productsRoutes from "./products";
import cartsRoutes from "./carts";
import ordersRoutes from "./orders";

const router = Router();

router.use("/auth", authRoutes);
router.use("/addresses", addressRoutes);
router.use("/admin", adminRoutes);
router.use("/products", productsRoutes);
router.use("/carts", cartsRoutes);
router.use("/orders", ordersRoutes);

export default router;
