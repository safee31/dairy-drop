import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireCustomer } from "@/middleware/roles-auth";
import customerAuthRoutes from "./auth";
import profileRoutes from "./profile";
import addressRoutes from "./addresses";
import cartsRoutes from "./carts";
import ordersRoutes from "./orders";
import reviewsRoutes from "./reviews";

const router = Router();

// Customer auth routes (public - no session middleware)
router.use("/auth", customerAuthRoutes);

// Apply customer middleware globally for all protected routes
router.use(validateLoginSession);
router.use(requireCustomer);

router.use("/profile", profileRoutes);
router.use("/addresses", addressRoutes);
router.use("/carts", cartsRoutes);
router.use("/orders", ordersRoutes);
router.use("/reviews", reviewsRoutes);

export default router;
