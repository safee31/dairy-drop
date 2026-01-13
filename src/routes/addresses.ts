import { Router } from "express";
import * as addressController from "../controllers/address";
import { validateLoginSession } from "../middleware/validateLoginSession";
import { validateCsrfToken } from "../middleware/csrf";
import { apiRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.use(validateLoginSession);
router.use(apiRateLimiter);

router.get("/", addressController.getUserAddresses);
router.post("/", validateCsrfToken, addressController.createAddress);
router.get("/:id", addressController.getAddressById);
router.put("/:id", validateCsrfToken, addressController.updateAddress);
router.delete("/:id", validateCsrfToken, addressController.deleteAddress);
router.patch("/:id/set-primary", validateCsrfToken, addressController.setPrimaryAddress);

export default router;
