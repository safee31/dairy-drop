import { Router } from "express";
import { uploadSingle } from "@/middleware/upload";
import { validate } from "@/middleware/validate";
import { adminCustomerSchemas } from "@/models/user";
import customerCtrl from "@/controllers/admin/customers";

const router = Router();

router.get("/", validate(adminCustomerSchemas.query), customerCtrl.getAllCustomers);
router.get("/:id", customerCtrl.getCustomerById);
router.post("/", uploadSingle("file"), validate(adminCustomerSchemas.create), customerCtrl.createCustomer);
router.put("/:id", validate(adminCustomerSchemas.update), customerCtrl.updateCustomer);
router.patch("/:id/toggle-status", customerCtrl.toggleCustomerStatus);
router.post("/:id/image", uploadSingle("file"), customerCtrl.uploadCustomerImage);
router.delete("/:id/image", customerCtrl.deleteCustomerImage);

export default router;
