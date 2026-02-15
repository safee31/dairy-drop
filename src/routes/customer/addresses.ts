import { Router } from "express";
import addressCtrl from "@/controllers/address";
import { validateCsrfToken } from "@/middleware/csrf";
import { apiRateLimiter } from "@/middleware/rateLimiter";

const router = Router();

// Auth + role middleware applied by customer/index.ts
router.use(apiRateLimiter);

router.get("/", addressCtrl.getUserAddresses);
router.post("/", validateCsrfToken, addressCtrl.createAddress);
router.get("/:id", addressCtrl.getAddressById);
router.put("/:id", validateCsrfToken, addressCtrl.updateAddress);
router.delete("/:id", validateCsrfToken, addressCtrl.deleteAddress);
router.patch("/:id/set-primary", validateCsrfToken, addressCtrl.setPrimaryAddress);

export default router;
