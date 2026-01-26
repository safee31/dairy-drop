import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireAdmin } from "@/middleware/roles-auth";
import categoriesRoutes from "./categories";
import customersRoutes from "./customers";
import productsRoutes from "./products";
import inventoryRoutes from "./inventory";
import ordersRoutes from "./orders";
import cartsRoutes from "./carts";
import heroSectionsRoutes from "./heroSections";

const router = Router();

// Apply admin middleware globally for all admin routes
router.use(validateLoginSession);
router.use(requireAdmin);

router.use("/categories", categoriesRoutes);
router.use("/customers", customersRoutes);
router.use("/products", productsRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/orders", ordersRoutes);
router.use("/carts", cartsRoutes);
router.use("/hero-sections", heroSectionsRoutes);

export default router;
