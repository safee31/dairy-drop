import { Router } from "express";
import * as addressController from "../controllers/address";
import { authenticate } from "../middleware/auth";
import { apiRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.use(authenticate);
router.use(apiRateLimiter);

router.get("/", addressController.getUserAddresses);
router.post("/", addressController.createAddress);
router.get("/:id", addressController.getAddressById);
router.put("/:id", addressController.updateAddress);
router.delete("/:id", addressController.deleteAddress);
router.patch("/:id/set-primary", addressController.setPrimaryAddress);

export default router;
