import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireAdmin } from "@/middleware/roles-auth";
import adminAuthRoutes from "./auth";
import categoriesRoutes from "./categories";
import customersRoutes from "./customers";
import productsRoutes from "./products";
import inventoryRoutes from "./inventory";
import ordersRoutes from "./orders";
import cartsRoutes from "./carts";
import heroSectionsRoutes from "./heroSections";
import reviewsRoutes from "./reviews";
import dashboardRoutes from "./dashboard";

const router = Router();

// Admin auth routes (public - no session middleware)
router.use("/auth", adminAuthRoutes);

// Apply admin middleware globally for all protected routes
router.use(validateLoginSession);
router.use(requireAdmin);

router.use("/dashboard", dashboardRoutes);
router.use("/categories", categoriesRoutes);
router.use("/customers", customersRoutes);
router.use("/products", productsRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/orders", ordersRoutes);
router.use("/carts", cartsRoutes);
router.use("/hero-sections", heroSectionsRoutes);
router.use("/reviews", reviewsRoutes);

export default router;
