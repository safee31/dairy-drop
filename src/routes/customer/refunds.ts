import { Router } from "express";
import { validateCsrfToken } from "@/middleware/csrf";
import { upload } from "@/middleware/upload";
import refundCtrl from "@/controllers/customer/refunds";

const router = Router();

router.get("/", refundCtrl.listRefunds);
router.post("/", validateCsrfToken, refundCtrl.createRefund);
router.post("/:id/evidence", upload.array("evidence", 3), refundCtrl.uploadEvidence);
router.get("/eligibility/:orderId", refundCtrl.checkEligibility);
router.get("/:id", refundCtrl.getRefund);

export default router;
