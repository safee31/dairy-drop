import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { ProductRepo, ProductReviewRepo, OrderLineItemRepo } from "@/models/repositories";
import { ReviewStatus } from "@/models/productReview/entity";

// Public product listing for customers
const listProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    categoryIds,
    categoryLevel1Ids,
    categoryLevel2Ids,
    brand,
    minPrice,
    maxPrice,
    sortBy = "createdAt",
    order = "DESC",
  } = req.query as any;

  const skip = (Number(page) - 1) * Number(limit);

  const qb = ProductRepo.createQueryBuilder("product")
    .leftJoinAndSelect("product.category", "category")
    .leftJoinAndSelect("product.categoryLevel1", "categoryLevel1")
    .leftJoinAndSelect("product.categoryLevel2", "categoryLevel2")
    .leftJoinAndSelect("product.images", "images")
    .leftJoinAndSelect("product.inventory", "inventory")
    .where("product.isActive = :isActive", { isActive: true })
    .andWhere("product.isDeleted = :isDeleted", { isDeleted: false });

  if (search) {
    qb.andWhere(
      "(product.name ILIKE :search OR product.sku ILIKE :search OR product.brand ILIKE :search OR product.description ILIKE :search)",
      { search: `%${search}%` },
    );
  }

  // Handle array params - RTK sends arrays as comma-separated strings
  // Convert to proper arrays
  const parseCategoryIds = (ids: any): string[] => {
    if (!ids) return [];
    if (Array.isArray(ids)) return ids;
    return typeof ids === 'string' ? ids.split(',').map(id => id.trim()).filter(Boolean) : [ids];
  };

  const catIds = parseCategoryIds(categoryIds);
  const catLevel1Ids = parseCategoryIds(categoryLevel1Ids);
  const catLevel2Ids = parseCategoryIds(categoryLevel2Ids);

  // Build OR conditions for categories
  if (catIds.length > 0 || catLevel1Ids.length > 0 || catLevel2Ids.length > 0) {
    const conditions: string[] = [];
    const params: Record<string, any> = {};

    if (catIds.length > 0) {
      conditions.push(`product.categoryId IN (:...categoryIds)`);
      params.categoryIds = catIds;
    }
    if (catLevel1Ids.length > 0) {
      conditions.push(`product.categoryLevel1Id IN (:...categoryLevel1Ids)`);
      params.categoryLevel1Ids = catLevel1Ids;
    }
    if (catLevel2Ids.length > 0) {
      conditions.push(`product.categoryLevel2Id IN (:...categoryLevel2Ids)`);
      params.categoryLevel2Ids = catLevel2Ids;
    }

    if (conditions.length > 0) {
      qb.andWhere(`(${conditions.join(" OR ")})`, params);
    }
  }

  if (brand) qb.andWhere("product.brand ILIKE :brand", { brand: `%${brand}%` });
  if (minPrice) qb.andWhere("product.price >= :minPrice", { minPrice: Number(minPrice) });
  if (maxPrice) qb.andWhere("product.price <= :maxPrice", { maxPrice: Number(maxPrice) });

  const total = await qb.getCount();

  const products = await qb
    .orderBy(`product.${String(sortBy)}`, String(order).toUpperCase() as "ASC" | "DESC")
    .skip(skip)
    .take(Number(limit))
    .getMany();

  // Batch fetch review stats for all products
  let productsWithRatings: any[] = products;
  if (products.length > 0) {
    const productIds = products.map((p) => p.id);
    const reviewStats = await ProductReviewRepo.createQueryBuilder("review")
      .select("review.productId", "productId")
      .addSelect("COUNT(review.id)", "reviewCount")
      .addSelect("ROUND(AVG(review.rating)::numeric, 1)", "averageRating")
      .where("review.productId IN (:...productIds)", { productIds })
      .andWhere("review.status = :status", { status: ReviewStatus.APPROVED })
      .groupBy("review.productId")
      .getRawMany();

    const statsMap = new Map(reviewStats.map((s: any) => [s.productId, s]));
    productsWithRatings = products.map((p) => ({
      ...p,
      averageRating: Number(statsMap.get(p.id)?.averageRating || 0),
      reviewCount: Number(statsMap.get(p.id)?.reviewCount || 0),
    }));
  }

  return responseHandler.success(
    res,
    {
      products: productsWithRatings,
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
const getPopularProducts = asyncHandler(async (req, res, next) => {
  const orderedProducts = await OrderLineItemRepo.createQueryBuilder("li")
    .innerJoin(
      "products",
      "product",
      'product.id = li."productId" AND product."isActive" = true AND product."isDeleted" = false',
    )
    .select("product.category_level2_id", "categoryLevel2Id")
    .orderBy('MAX(li."createdAt")', "DESC")
    .groupBy("product.category_level2_id")
    .limit(10)
    .getRawMany();

  const categoryLevel2Ids = orderedProducts
    .map((r: any) => r.categoryLevel2Id)
    .filter(Boolean);

  if (categoryLevel2Ids.length === 0) {
    return responseHandler.success(
      res,
      { products: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      "No popular products found",
    );
  }

  req.query.categoryLevel2Ids = categoryLevel2Ids.join(",");
  req.query.limit = "10";
  req.query.page = "1";

  await listProducts(req, res, next);
});



const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await ProductRepo.createQueryBuilder("product")
    .leftJoinAndSelect("product.category", "category")
    .leftJoinAndSelect("product.categoryLevel1", "categoryLevel1")
    .leftJoinAndSelect("product.categoryLevel2", "categoryLevel2")
    .leftJoinAndSelect("product.images", "images")
    .leftJoinAndSelect("product.inventory", "inventory")
    .where("product.id = :id AND product.isActive = :isActive AND product.isDeleted = :isDeleted", { id, isActive: true, isDeleted: false })
    .getOne();

  if (!product) return responseHandler.error(res, "Product not found", 404);

  // Fetch approved reviews with user info and responses
  const reviews = await ProductReviewRepo.createQueryBuilder("review")
    .leftJoin("review.user", "user")
    .addSelect(["user.id", "user.fullName"])
    .leftJoinAndSelect("review.responses", "responses")
    .leftJoin("responses.user", "respUser")
    .addSelect(["respUser.id", "respUser.fullName"])
    .where("review.productId = :productId", { productId: id })
    .andWhere("review.status = :status", { status: ReviewStatus.APPROVED })
    .orderBy("review.createdAt", "DESC")
    .getMany();

  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0
    ? Math.round((reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviewCount) * 10) / 10
    : 0;

  return responseHandler.success(res, {
    ...product,
    reviews,
    reviewCount,
    averageRating,
  }, "Product retrieved");
});

export default { listProducts, getProduct, getPopularProducts };
