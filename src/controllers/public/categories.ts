import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { CategoryRepo } from "@/models/repositories";

// Public category listing with hierarchy (for filters)
const listCategories = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 100,
    isActive = true,
    sortBy = "displayOrder",
    order = "ASC",
  } = req.query as any;

  const skip = (Number(page) - 1) * Number(limit);

  const qb = CategoryRepo.createQueryBuilder("category")
    .leftJoinAndSelect(
      "category.children",
      "level1",
      "level1.isActive = :isActive",
      { isActive: isActive === "true" || isActive === true }
    )
    .leftJoinAndSelect(
      "level1.children",
      "level2",
      "level2.isActive = :isActive"
    )
    .where("category.isActive = :catActive", {
      catActive: isActive === "true" || isActive === true,
    });

  const total = await qb.getCount();

  const categories = await qb
    .orderBy(`category.${String(sortBy)}`, String(order).toUpperCase() as "ASC" | "DESC")
    .skip(skip)
    .take(Number(limit))
    .getMany();

  return responseHandler.success(
    res,
    {
      categories,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
    "Categories retrieved successfully",
  );
});

// Get single category with full hierarchy
const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await CategoryRepo.createQueryBuilder("category")
    .leftJoinAndSelect("category.children", "level1")
    .leftJoinAndSelect("level1.children", "level2")
    .where("category.id = :id", { id })
    .andWhere("category.isActive = :isActive", { isActive: true })
    .getOne();

  if (!category) {
    return responseHandler.error(res, "Category not found", 404);
  }

  return responseHandler.success(res, category, "Category retrieved successfully");
});

export default { listCategories, getCategory };

