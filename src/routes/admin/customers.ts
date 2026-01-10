import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import { uploadSingle } from "@/middleware/upload";
import { validate } from "@/middleware/validate";
import { adminCustomerSchemas } from "@/models/user";
import * as customerController from "@/controllers/admin/customers";

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// Customer management routes
router.get("/customers", validate(adminCustomerSchemas.query), customerController.getAllCustomers);
router.get("/customers/:id", customerController.getCustomerById);
router.post("/customers", uploadSingle("profileImage"), validate(adminCustomerSchemas.create), customerController.createCustomer);
router.put("/customers/:id", uploadSingle("profileImage"), validate(adminCustomerSchemas.update), customerController.updateCustomer);
router.delete("/customers/:id", customerController.deleteCustomer);
router.patch("/customers/:id/toggle-status", customerController.toggleCustomerStatus);

export default router;

