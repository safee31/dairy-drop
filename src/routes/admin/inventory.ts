import { Router } from "express";
import { validateLoginSession } from "@/middleware/validateLoginSession";
import { requireAdmin } from "@/middleware/roles-auth";
import { validate } from "@/middleware/validate";
import { inventoryHistorySchemas } from "@/models/inventoryHistory";
import * as inventoryController from "@/controllers/admin/inventory";

const router = Router();

router.use(validateLoginSession);
router.use(requireAdmin);

// ============================================
// INVENTORY CRUD ROUTES
// ============================================

router.get("/", inventoryController.getAllInventory);
router.get("/summary", inventoryController.getInventorySummary);
router.get("/low-stock", inventoryController.getLowStockProducts);
router.get("/:id", inventoryController.getInventoryById);
router.put(
  "/:id/update-stock",
  validate(inventoryHistorySchemas.update),
  inventoryController.updateInventoryStock,
);
router.post(
  "/:id/adjust-stock",
  validate(inventoryHistorySchemas.create),
  inventoryController.adjustInventoryStock,
);

// ============================================
// INVENTORY HISTORY ROUTES
// ============================================

router.get("/:inventoryId/history", inventoryController.getInventoryHistory);

export default router;
