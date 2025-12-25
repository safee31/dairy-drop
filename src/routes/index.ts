import { Router } from "express";
import authRoutes from "./auth";
import addressRoutes from "./addresses";

const router = Router();

router.use("/auth", authRoutes);
router.use("/addresses", addressRoutes);

export default router;
