import { Router } from "express";
import authRoutes from "./auth";
import profileRoutes from "./profile";
import addressRoutes from "./addresses";
import adminRoutes from "./admin";
import productsRoutes from "./products";
import cartsRoutes from "./carts";
import ordersRoutes from "./orders";
import categoriesRoutes from "./categories";
import heroSectionsRoutes from "./heroSections";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/addresses", addressRoutes);
router.use("/admin", adminRoutes);
router.use("/products", productsRoutes);
router.use("/categories", categoriesRoutes);
router.use("/hero-sections", heroSectionsRoutes);
router.use("/carts", cartsRoutes);
router.use("/orders", ordersRoutes);

export default router;
