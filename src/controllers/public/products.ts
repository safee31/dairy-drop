import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { ProductRepo } from "@/models/repositories";

// Public product listing for customers
export const listProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    categoryId,
    categoryLevel1Id,
    categoryLevel2Id,
    brand,
    minPrice,
    maxPrice,
    sortBy = "createdAt",
    order = "DESC",
  } = req.query as any;

  const skip = (Number(page) - 1) * Number(limit);

  const qb = ProductRepo.createQueryBuilder("product")
    .leftJoinAndSelect("product.categoryLevel2", "level2")
    .leftJoinAndSelect("level2.categoryLevel1", "level1")
    .leftJoinAndSelect("level1.category", "category")
    .leftJoinAndSelect("product.images", "images")
    .where("product.isActive = :isActive", { isActive: true });

  if (search) {
    qb.andWhere(
      "(product.name ILIKE :search OR product.sku ILIKE :search OR product.brand ILIKE :search OR product.description ILIKE :search)",
      { search: `%${search}%` },
    );
  }

  if (categoryLevel2Id) qb.andWhere("product.categoryLevel2Id = :categoryLevel2Id", { categoryLevel2Id });
  if (categoryLevel1Id) qb.andWhere("product.categoryLevel1Id = :categoryLevel1Id", { categoryLevel1Id });
  if (categoryId) qb.andWhere("product.categoryId = :categoryId", { categoryId });
  if (brand) qb.andWhere("product.brand ILIKE :brand", { brand: `%${brand}%` });
  if (minPrice) qb.andWhere("product.price >= :minPrice", { minPrice: Number(minPrice) });
  if (maxPrice) qb.andWhere("product.price <= :maxPrice", { maxPrice: Number(maxPrice) });

  const total = await qb.getCount();

  const products = await qb
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
    "Products retrieved",
  );
});

export const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await ProductRepo.findOne({
    where: { id, isActive: true },
    relations: [
      "categoryLevel2",
      "categoryLevel2.categoryLevel1",
      "categoryLevel2.categoryLevel1.category",
      "images",
    ],
  });

  if (!product) return responseHandler.error(res, "Product not found", 404);

  return responseHandler.success(res, product, "Product retrieved");
});

export default { listProducts, getProduct };
