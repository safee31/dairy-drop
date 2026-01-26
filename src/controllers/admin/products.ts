import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { auditLogger } from "@/utils/logger";
import { ProductRepo, InventoryRepo } from "@/models/repositories";
import { Product, CreateProduct, UpdateProduct, productUtils } from "@/models/product";
import { Not } from "typeorm";

const getAllProducts = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search = "",
        categoryId,
        isActive,
        sortBy = "createdAt",
        order = "DESC",
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const baseQuery = ProductRepo.createQueryBuilder("product")
        .leftJoinAndSelect("product.category", "category")
        .leftJoinAndSelect(
            "product.images",
            "images",
            "images.isPrimary = :isPrimary",
            { isPrimary: true }
        );

    if (search) {
        baseQuery.andWhere(
            "(product.name ILIKE :search OR product.sku ILIKE :search OR product.brand ILIKE :search)",
            { search: `%${search}%` },
        );
    }

    if (categoryId) {
        baseQuery.andWhere("product.categoryId = :categoryId", { categoryId });
    }

    if (isActive !== undefined) {
        baseQuery.andWhere("product.isActive = :isActive", {
            isActive: isActive === "true",
        });
    }

    const [products, total] = await Promise.all([
        baseQuery
            .select([
                "product.id",
                "product.name",
                "product.brand",
                "product.price",
                "product.salePrice",
                "product.isActive",
                "product.isDeleted",
                "product.createdAt",
                "category.id",
                "category.name",
                "images.id",
                "images.imageUrl",
                "images.isPrimary",
                "images.displayOrder",
            ])
            .orderBy(`product.${String(sortBy)}`, String(order).toUpperCase() as "ASC" | "DESC")
            .skip(skip)
            .take(Number(limit))
            .getMany(),
        baseQuery.getCount(),
    ]);

    return responseHandler.success(
        res,
        {
            products,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        },
        "Products retrieved successfully",
    );
});

const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await ProductRepo.findOne({
        where: { id, isDeleted: false },
        relations: [
            "categoryLevel2",
            "categoryLevel2.categoryLevel1",
            "categoryLevel2.categoryLevel1.category",
            "images",
            "inventory",
        ],
    });

    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    return responseHandler.success(res, product, "Product retrieved successfully");
});

const createProduct = asyncHandler(async (req, res) => {
    const createDto = req.body as CreateProduct;

    // Check SKU uniqueness
    const existingSku = await ProductRepo.findOne({
        where: { sku: createDto.sku, isDeleted: false },
    });

    if (existingSku) {
        return responseHandler.error(res, "SKU already exists", 409);
    }

    // Create product
    const product = ProductRepo.create({
        name: createDto.name,
        description: createDto.description,
        sku: createDto.sku,
        categoryLevel2Id: createDto.categoryLevel2Id,
        categoryLevel1Id: createDto.categoryLevel1Id,
        categoryId: createDto.categoryId,
        price: createDto.price,
        salePrice: productUtils.calculateSalePrice(createDto.price, createDto.discount || null),
        discount: createDto.discount || null,
        brand: createDto.brand,
        fatContent: createDto.fatContent,
        weight: createDto.weight,
        shelfLife: createDto.shelfLife,
        isActive: true,
    });

    const savedProduct = await ProductRepo.save(product);

    // Create inventory if provided
    if (createDto.inventory) {
        const inventory = InventoryRepo.create({
            productId: savedProduct.id,
            stockQuantity: createDto.inventory.stockQuantity || 0,
            reorderLevel: createDto.inventory.reorderLevel || 10,
            inStock: (createDto.inventory.stockQuantity || 0) > 0,
        });
        await InventoryRepo.save(inventory);
    }

    auditLogger.info("Product created", {
        productId: savedProduct.id,
        productName: savedProduct.name,
        sku: savedProduct.sku,
    });

    return responseHandler.success(
        res,
        await getProductDetails(savedProduct.id),
        "Product created successfully",
        201,
    );
});

const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateDto = req.body as UpdateProduct;

    const product = await ProductRepo.findOne({ where: { id, isDeleted: false } });

    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    // Update category IDs if provided (allows direct updates of all 3 IDs)
    if (updateDto.categoryId) product.categoryId = updateDto.categoryId;
    if (updateDto.categoryLevel1Id) product.categoryLevel1Id = updateDto.categoryLevel1Id;
    if (updateDto.categoryLevel2Id) product.categoryLevel2Id = updateDto.categoryLevel2Id;


    // Check SKU uniqueness if updating
    if (updateDto.sku && updateDto.sku !== product.sku) {
        const existingSku = await ProductRepo.findOne({
            where: { sku: updateDto.sku, id: Not(id), isDeleted: false },
        });

        if (existingSku) {
            return responseHandler.error(res, "SKU already exists", 409);
        }
    }

    // Update fields
    if (updateDto.name) product.name = updateDto.name;
    if (updateDto.description) product.description = updateDto.description;
    if (updateDto.sku) product.sku = updateDto.sku;
    if (updateDto.price) product.price = updateDto.price;
    if (updateDto.brand) product.brand = updateDto.brand;
    if (updateDto.fatContent) product.fatContent = updateDto.fatContent;
    if (updateDto.weight) product.weight = updateDto.weight;
    if (updateDto.shelfLife) product.shelfLife = updateDto.shelfLife;

    if (updateDto.price || updateDto.discount) {
        const newPrice = updateDto.price || product.price;
        const newDiscount = updateDto.discount ? updateDto.discount : product.discount;
        product.discount = newDiscount;
        product.salePrice = productUtils.calculateSalePrice(newPrice, newDiscount);
    }

    await ProductRepo.save(product);

    auditLogger.info("Product updated", {
        productId: product.id,
        productName: product.name,
    });

    return responseHandler.success(res, await getProductDetails(id), "Product updated successfully");
});

const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await ProductRepo.findOne({
        where: { id, isDeleted: false },
    });

    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    // Soft delete - mark as deleted without removing from database
    product.isDeleted = true;
    await ProductRepo.save(product);

    auditLogger.info("Product soft deleted", {
        productId: product.id,
        productName: product.name,
    });

    return responseHandler.success(res, null, "Product deleted successfully");
});

const toggleProductStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await ProductRepo.findOne({ where: { id, isDeleted: false } });

    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    product.isActive = !product.isActive;
    await ProductRepo.save(product);

    auditLogger.info("Product status toggled", {
        productId: product.id,
        isActive: product.isActive,
    });

    return responseHandler.success(res, product, "Product status toggled successfully");
});

async function getProductDetails(productId: string): Promise<Product | null> {
    const product = await ProductRepo.findOne({
        where: { id: productId, isDeleted: false },
        relations: [
            "categoryLevel2",
            "categoryLevel2.categoryLevel1",
            "categoryLevel2.categoryLevel1.category",
            "category",
            "images",
            "inventory",
        ],
    });

    return product;
}

export default {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
};
