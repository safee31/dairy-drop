import { Router } from "express";
import { validate } from "@/middleware/validate";
import { validateCsrfToken } from "@/middleware/csrf";
import { reviewSchemas } from "@/models/productReview";
import reviewCtrl from "@/controllers/customer/reviews";

const router = Router();

// Auth + role middleware applied by customer/index.ts

router.get("/", reviewCtrl.listMyReviews);
router.get("/order/:orderId", reviewCtrl.getOrderReviews);
router.post("/", validateCsrfToken, validate(reviewSchemas.create), reviewCtrl.createReview);
router.patch("/:id", validateCsrfToken, validate(reviewSchemas.update), reviewCtrl.updateReview);
router.delete("/:id", validateCsrfToken, reviewCtrl.deleteReview);

export default router;
