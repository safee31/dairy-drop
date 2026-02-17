import { Router } from "express";
import { validate } from "@/middleware/validate";
import refundSchemas from "@/models/refund/schema";
import refundCtrl from "@/controllers/admin/refunds";

const router = Router();

router.get("/", refundCtrl.listAllRefunds);
router.get("/:id", refundCtrl.getRefundDetails);
router.patch("/:id/status", validate(refundSchemas.updateStatus), refundCtrl.updateRefundStatus);
router.patch("/:id/payment", validate(refundSchemas.updatePayment), refundCtrl.updateRefundPayment);

export default router;
