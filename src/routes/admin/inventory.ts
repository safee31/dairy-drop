import { Router } from "express";
import { validate } from "@/middleware/validate";
import { inventoryHistorySchemas } from "@/models/inventoryHistory";
import inventoryCtrl from "@/controllers/admin/inventory";

const router = Router();

// Auth + role middleware applied by admin/index.ts

// ============================================
// INVENTORY CRUD ROUTES
// ============================================

router.get("/", inventoryCtrl.getAllInventory);
router.get("/summary", inventoryCtrl.getInventorySummary);
router.get("/low-stock", inventoryCtrl.getLowStockProducts);
router.get("/:id", inventoryCtrl.getInventoryById);
router.post(
  "/:id/adjust-stock",
  validate(inventoryHistorySchemas.adjustStock),
  inventoryCtrl.adjustInventoryStock,
);

// ============================================
// INVENTORY HISTORY ROUTES
// ============================================

router.get("/:inventoryId/history", inventoryCtrl.getInventoryHistory);

export default router;
