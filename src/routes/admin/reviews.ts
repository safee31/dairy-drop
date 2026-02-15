import { Router } from "express";
import { validate } from "@/middleware/validate";
import { reviewSchemas } from "@/models/productReview";
import reviewCtrl from "@/controllers/admin/reviews";

const router = Router();

// Auth + role middleware applied by admin/index.ts

router.get("/", reviewCtrl.listAllReviews);
router.get("/:id", reviewCtrl.getReview);
router.patch("/:id/status", validate(reviewSchemas.updateStatus), reviewCtrl.updateReviewStatus);
router.post("/:id/response", validate(reviewSchemas.createResponse), reviewCtrl.createResponse);
router.delete("/:id/response/:responseId", reviewCtrl.deleteResponse);
router.delete("/:id", reviewCtrl.deleteReview);

export default router;
