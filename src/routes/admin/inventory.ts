import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { inventoryHistorySchemas } from "@/models/inventoryHistory";
import * as inventoryController from "@/controllers/admin/inventory";

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// ============================================
// INVENTORY CRUD ROUTES
// ============================================

router.get("/inventory", inventoryController.getAllInventory);
router.get("/inventory/summary", inventoryController.getInventorySummary);
router.get("/inventory/low-stock", inventoryController.getLowStockProducts);
router.get("/inventory/:id", inventoryController.getInventoryById);
router.put(
  "/inventory/:id/update-stock",
  validate(inventoryHistorySchemas.update),
  inventoryController.updateInventoryStock,
);
router.post(
  "/inventory/:id/adjust-stock",
  validate(inventoryHistorySchemas.create),
  inventoryController.adjustInventoryStock,
);

// ============================================
// INVENTORY HISTORY ROUTES
// ============================================

router.get("/inventory/:inventoryId/history", inventoryController.getInventoryHistory);

export default router;
