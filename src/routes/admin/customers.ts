import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireAdmin } from "@/middleware/roles-auth";
import { uploadSingle } from "@/middleware/upload";
import { validate } from "@/middleware/validate";
import { adminCustomerSchemas } from "@/models/user";
import * as customerController from "@/controllers/admin/customers";

const router = Router();

router.use(validateLoginSession);
router.use(requireAdmin);

// Customer management routes
router.get("/", validate(adminCustomerSchemas.query), customerController.getAllCustomers);
router.get("/:id", customerController.getCustomerById);
router.post("/", uploadSingle("profileImage"), validate(adminCustomerSchemas.create), customerController.createCustomer);
router.put("/:id", uploadSingle("profileImage"), validate(adminCustomerSchemas.update), customerController.updateCustomer);
router.delete("/:id", customerController.deleteCustomer);
router.patch("/:id/toggle-status", customerController.toggleCustomerStatus);

export default router;

