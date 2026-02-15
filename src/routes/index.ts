import { Router } from "express";
import customerRoutes from "./customer";
import adminRoutes from "./admin";
import productsRoutes from "./products";
import categoriesRoutes from "./categories";
import heroSectionsRoutes from "./heroSections";

const router = Router();

// Role-based route groups (auth + protected routes aggregated inside)
router.use("/customer", customerRoutes);
router.use("/admin", adminRoutes);

// Public routes (no auth required)
router.use("/products", productsRoutes);
router.use("/categories", categoriesRoutes);
router.use("/hero-sections", heroSectionsRoutes);

export default router;
