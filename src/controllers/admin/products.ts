import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { auditLogger } from "@/utils/logger";
import { ProductRepo, CategoryLevel2Repo } from "@/models/repositories";
import { Product, CreateProduct, UpdateProduct, productUtils } from "@/models/product";

export const getAllProducts = asyncHandler(async (req, res) => {
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
    const queryBuilder = ProductRepo.createQueryBuilder("product")
        .leftJoinAndSelect("product.categoryLevel2", "level2")
        .leftJoinAndSelect("level2.categoryLevel1", "level1")
        .leftJoinAndSelect("level1.category", "category")
        .leftJoinAndSelect("product.images", "images");

    if (search) {
        queryBuilder.andWhere(
            "(product.name ILIKE :search OR product.sku ILIKE :search OR product.brand ILIKE :search)",
            { search: `%${search}%` },
        );
    }

    if (categoryId) {
        queryBuilder.andWhere("product.categoryId = :categoryId", { categoryId });
    }

    if (isActive !== undefined) {
        queryBuilder.andWhere("product.isActive = :isActive", {
            isActive: isActive === "true",
        });
    }

    const total = await queryBuilder.getCount();

    const products = await queryBuilder
        .orderBy(`product.${String(sortBy)}`, String(order).toUpperCase() as "ASC" | "DESC")
        .skip(skip)
        .take(Number(limit))
        .getMany();

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

export const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await ProductRepo.findOne({
        where: { id },
        relations: [
            "categoryLevel2",
            "categoryLevel2.categoryLevel1",
            "categoryLevel2.categoryLevel1.category",
            "images",
        ],
    });

    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    return responseHandler.success(res, product, "Product retrieved successfully");
});

export const createProduct = asyncHandler(async (req, res) => {
    const createDto = req.body as CreateProduct;

    // Validate category exists
    const categoryLevel2 = await CategoryLevel2Repo.findOne({
        where: { id: createDto.categoryLevel2Id, isActive: true },
        relations: ["categoryLevel1"],
    });

    if (!categoryLevel2) {
        return responseHandler.error(res, "Selected category not found or inactive", 404);
    }

    // Check SKU uniqueness
    const existingSku = await ProductRepo.findOne({
        where: { sku: createDto.sku },
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
        categoryLevel1Id: categoryLevel2.categoryLevel1Id,
        categoryId: categoryLevel2.categoryId,
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

export const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateDto = req.body as UpdateProduct;

    const product = await ProductRepo.findOne({ where: { id } });

    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    // Validate category if updating
    if (updateDto.categoryLevel2Id) {
        const categoryLevel2 = await CategoryLevel2Repo.findOne({
            where: { id: updateDto.categoryLevel2Id, isActive: true },
            relations: ["categoryLevel1"],
        });

        if (!categoryLevel2) {
            return responseHandler.error(res, "Selected category not found or inactive", 404);
        }

        product.categoryLevel2Id = updateDto.categoryLevel2Id;
        product.categoryLevel1Id = categoryLevel2.categoryLevel1Id;
        product.categoryId = categoryLevel2.categoryId;
    }

    // Check SKU uniqueness if updating
    if (updateDto.sku && updateDto.sku !== product.sku) {
        const existingSku = await ProductRepo.findOne({
            where: { sku: updateDto.sku },
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
    if (updateDto.isActive !== undefined) product.isActive = updateDto.isActive;

    if (updateDto.price || updateDto.discount !== undefined) {
      const newPrice = updateDto.price || product.price;
      const newDiscount = updateDto.discount !== undefined ? updateDto.discount : product.discount;
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

export const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await ProductRepo.findOne({ where: { id } });

    if (!product) {
        return responseHandler.error(res, "Product not found", 404);
    }

    await ProductRepo.remove(product);

    auditLogger.info("Product deleted", {
        productId: product.id,
        productName: product.name,
    });

    return responseHandler.success(res, null, "Product deleted successfully");
});

export const toggleProductStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await ProductRepo.findOne({ where: { id } });

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
        where: { id: productId },
        relations: ["categoryLevel2", "categoryLevel2.categoryLevel1", "categoryLevel2.categoryLevel1.category", "images"],
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
