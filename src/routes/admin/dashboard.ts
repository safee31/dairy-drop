import { Router } from "express";
import dashboardCtrl from "@/controllers/admin/dashboard";

const router = Router();

// Auth + role middleware applied by admin/index.ts

router.get("/", dashboardCtrl.getOverview);

export default router;
