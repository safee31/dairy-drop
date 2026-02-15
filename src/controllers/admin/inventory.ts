import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { auditLogger } from "@/utils/logger";
import { InventoryRepo, InventoryHistoryRepo } from "@/models/repositories";
import { CreateInventoryHistory } from "@/models/inventoryHistory";

// ============================================
// INVENTORY CRUD OPERATIONS
// ============================================

const getAllInventory = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search = "",
        productId,
        inStock,
        lowStock,
        sortBy = "createdAt",
        order = "DESC",
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const queryBuilder = InventoryRepo.createQueryBuilder("inventory")
        .leftJoinAndSelect("inventory.product", "product", "product.id IS NOT NULL", {
          select: ["product.id", "product.name", "product.sku", "product.brand"],
        });

    // Search by product name, SKU, or brand
    if (search) {
        queryBuilder.andWhere(
            "(product.name ILIKE :search OR product.sku ILIKE :search OR product.brand ILIKE :search)",
            { search: `%${search}%` }
        );
    }

    if (productId) {
        queryBuilder.andWhere("inventory.productId = :productId", { productId });
    }

    if (inStock !== undefined) {
        queryBuilder.andWhere("inventory.inStock = :inStock", {
            inStock: inStock === "true",
        });
    }

    if (lowStock === "true") {
        queryBuilder.andWhere("inventory.stockQuantity <= inventory.reorderLevel");
    }

    const total = await queryBuilder.getCount();

    const inventory = await queryBuilder
        .orderBy(`inventory.${String(sortBy)}`, String(order).toUpperCase() as "ASC" | "DESC")
        .skip(skip)
        .take(Number(limit))
        .getMany();

    return responseHandler.success(
        res,
        {
            inventory,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        },
        "Inventory retrieved successfully",
    );
});

const getInventoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const inventory = await InventoryRepo.findOne({
        where: { id },
        relations: ["product", "product.categoryLevel2", "product.categoryLevel2.categoryLevel1", "product.categoryLevel2.categoryLevel1.category", "history"],
    });

    if (!inventory) {
        return responseHandler.error(res, "Inventory not found", 404);
    }

    return responseHandler.success(res, inventory, "Inventory retrieved successfully");
});

const adjustInventoryStock = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantityChange, operationType, reorderLevel, referenceId, notes } = req.body;

    const inventory = await InventoryRepo.findOne({
        where: { id },
        relations: ["product"],
    });

    if (!inventory) {
        return responseHandler.error(res, "Inventory not found", 404);
    }

    const previousQuantity = inventory.stockQuantity;

    // Adjust stock quantity if provided
    if (quantityChange) {
        const newQuantity = previousQuantity + quantityChange;

        if (newQuantity < 0) {
            return responseHandler.error(res, "Adjustment would result in negative stock", 400);
        }

        inventory.stockQuantity = newQuantity;
        inventory.inStock = newQuantity > 0;

        // Record adjustment in history
        const history = InventoryHistoryRepo.create({
            inventoryId: inventory.id,
            quantityChange,
            newStockQuantity: newQuantity,
            type: operationType,
            referenceId: referenceId || null,
            notes: notes || `${operationType} adjustment`,
        } as CreateInventoryHistory);

        await InventoryHistoryRepo.save(history);
    }

    // Update reorder level if provided
    if (reorderLevel !== undefined) {
        inventory.reorderLevel = reorderLevel;
    }

    await InventoryRepo.save(inventory);

    auditLogger.info("Inventory adjusted", {
        inventoryId: inventory.id,
        productId: inventory.productId,
        operationType: operationType || null,
        quantityChange: quantityChange || 0,
        reorderLevel: reorderLevel ?? inventory.reorderLevel,
        previousQuantity,
        newQuantity: inventory.stockQuantity,
    });

    return responseHandler.success(
        res,
        await getInventoryDetails(id),
        "Inventory adjusted successfully",
    );
});

const getInventoryHistory = asyncHandler(async (req, res) => {
    const { inventoryId } = req.params;
    const { page = 1, limit = 20, search = "", type, sortBy = "createdAt", order = "DESC" } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Verify inventory exists
    const inventory = await InventoryRepo.findOne({ where: { id: inventoryId } });

    if (!inventory) {
        return responseHandler.error(res, "Inventory not found", 404);
    }

    const queryBuilder = InventoryHistoryRepo.createQueryBuilder("history")
        .where("history.inventoryId = :inventoryId", { inventoryId });

    if (search) {
        queryBuilder.andWhere("history.notes ILIKE :search", { search: `%${search}%` });
    }

    if (type) {
        queryBuilder.andWhere("history.type = :type", { type });
    }

    const total = await queryBuilder.getCount();

    const history = await queryBuilder
        .orderBy(`history.${String(sortBy)}`, String(order).toUpperCase() as "ASC" | "DESC")
        .skip(skip)
        .take(Number(limit))
        .getMany();

    return responseHandler.success(
        res,
        {
            history,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        },
        "Inventory history retrieved successfully",
    );
});

const getLowStockProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = "", sortBy = "stockQuantity", order = "ASC" } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const queryBuilder = InventoryRepo.createQueryBuilder("inventory")
        .leftJoinAndSelect("inventory.product", "product")
        .leftJoinAndSelect("product.categoryLevel2", "categoryLevel2")
        .leftJoinAndSelect("categoryLevel2.categoryLevel1", "categoryLevel1")
        .leftJoinAndSelect("categoryLevel1.category", "category")
        .where("inventory.stockQuantity <= inventory.reorderLevel")
        .andWhere("product.isActive = :isActive", { isActive: true })
        .andWhere("product.isDeleted = :isDeleted", { isDeleted: false });

    if (search) {
        queryBuilder.andWhere(
            "(product.name ILIKE :search OR product.sku ILIKE :search OR product.brand ILIKE :search)",
            { search: `%${search}%` },
        );
    }

    const total = await queryBuilder.getCount();

    const inventory = await queryBuilder
        .orderBy(`inventory.${String(sortBy)}`, String(order).toUpperCase() as "ASC" | "DESC")
        .skip(skip)
        .take(Number(limit))
        .getMany();

    return responseHandler.success(
        res,
        {
            inventory,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        },
        "Low stock products retrieved successfully",
    );
});

const getInventorySummary = asyncHandler(async (_req, res) => {
    const totalProducts = await InventoryRepo.count();

    const lowStockCount = await InventoryRepo.createQueryBuilder("inventory")
        .where("inventory.stockQuantity <= inventory.reorderLevel")
        .getCount();

    const outOfStockCount = await InventoryRepo.createQueryBuilder("inventory")
        .where("inventory.inStock = :inStock", { inStock: false })
        .getCount();

    const totalStock = await InventoryRepo.createQueryBuilder("inventory")
        .select("SUM(inventory.stockQuantity)", "total")
        .getRawOne();

    const totalReserved = await InventoryRepo.createQueryBuilder("inventory")
        .select("SUM(inventory.reservedQuantity)", "total")
        .getRawOne();

    return responseHandler.success(
        res,
        {
            totalProducts,
            lowStockCount,
            outOfStockCount,
            totalStockQuantity: parseInt(totalStock.total || "0"),
            totalReservedQuantity: parseInt(totalReserved.total || "0"),
        },
        "Inventory summary retrieved successfully",
    );
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getInventoryDetails(inventoryId: string) {
    const inventory = await InventoryRepo.findOne({
        where: { id: inventoryId },
        relations: [
            "product",
            "product.categoryLevel2",
            "product.categoryLevel2.categoryLevel1",
            "product.categoryLevel2.categoryLevel1.category",
            "history",
        ],
    });

    return inventory;
}

export default {
    getAllInventory,
    getInventoryById,
    adjustInventoryStock,
    getInventoryHistory,
    getLowStockProducts,
    getInventorySummary,
};
