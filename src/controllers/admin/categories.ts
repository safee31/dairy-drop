import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { auditLogger } from "@/utils/logger";
import { CategoryRepo, CategoryLevel1Repo, CategoryLevel2Repo } from "@/models/repositories";
import { Category } from "@/models/category/category.entity";
import { CategoryLevel1 } from "@/models/category/category-level1.entity";
import { CategoryLevel2 } from "@/models/category/category-level2.entity";
// using responseHandler for immediate errors

// ============================================
// ROOT CATEGORY MANAGEMENT
// ============================================

export const getAllCategories = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    isActive,
    sortBy = "displayOrder",
    order = "ASC",
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const queryBuilder = CategoryRepo.createQueryBuilder("category")
    .leftJoinAndSelect("category.children", "level1", "level1.isActive = :childActive", {
      childActive: true,
    });

  if (search) {
    queryBuilder.andWhere("(category.name ILIKE :search OR category.slug ILIKE :search)", {
      search: `%${search}%`,
    });
  }

  if (isActive !== undefined) {
    queryBuilder.andWhere("category.isActive = :isActive", {
      isActive: isActive === "true",
    });
  }

  const total = await queryBuilder.getCount();

  const categories = await queryBuilder
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

export const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await CategoryRepo.createQueryBuilder("category")
    .leftJoinAndSelect("category.children", "level1")
    .where("category.id = :id", { id })
    .getOne();

  if (!category) {
    return responseHandler.error(res, "Category not found", 404);
  }

  return responseHandler.success(res, category, "Category retrieved successfully");
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, slug, description, imageUrl, displayOrder, isActive } = req.body;

  const existingCategory = await CategoryRepo.findOne({
    where: [{ name }, { slug }],
  });

  if (existingCategory) {
    return responseHandler.error(res, "Category with this name or slug already exists", 409);
  }

  const category = new Category();
  category.name = name;
  category.slug = slug;
  category.description = description || null;
  category.imageUrl = imageUrl || null;
  category.displayOrder = displayOrder || 0;
  category.isActive = isActive ?? true;

  await CategoryRepo.save(category);

  auditLogger.info("Category created", {
    categoryId: category.id,
    categoryName: category.name,
  });

  return responseHandler.success(res, category, "Category created successfully", 201);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, slug, description, imageUrl, displayOrder, isActive } = req.body;

  const category = await CategoryRepo.findOne({ where: { id } });

  if (!category) {
    return responseHandler.error(res, "Category not found", 404);
  }

  if (name || slug) {
    const existingCategory = await CategoryRepo.createQueryBuilder("category")
      .where("(category.name = :name OR category.slug = :slug) AND category.id != :id", {
        name: name || category.name,
        slug: slug || category.slug,
        id,
      })
      .getOne();

    if (existingCategory) {
      return responseHandler.error(res, "Category with this name or slug already exists", 409);
    }
  }

  if (name) category.name = name;
  if (slug) category.slug = slug;
  if (description !== undefined) category.description = description || null;
  if (imageUrl !== undefined) category.imageUrl = imageUrl || null;
  if (displayOrder !== undefined) category.displayOrder = displayOrder;
  if (isActive !== undefined) category.isActive = isActive;

  await CategoryRepo.save(category);

  auditLogger.info("Category updated", {
    categoryId: category.id,
    categoryName: category.name,
  });

  return responseHandler.success(res, category, "Category updated successfully");
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await CategoryRepo.findOne({
    where: { id },
    relations: ["children"],
  });

  if (!category) {
    return responseHandler.error(res, "Category not found", 404);
  }

  if (category.children && category.children.length > 0) {
    return responseHandler.error(res, "Cannot delete category with subcategories. Delete subcategories first.", 400);
  }

  await CategoryRepo.remove(category);

  auditLogger.info("Category deleted", {
    categoryId: category.id,
    categoryName: category.name,
  });

  return responseHandler.success(res, null, "Category deleted successfully");
});

export const toggleCategoryStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await CategoryRepo.findOne({ where: { id } });

  if (!category) {
    return responseHandler.error(res, "Category not found", 404);
  }

  category.isActive = !category.isActive;
  await CategoryRepo.save(category);

  auditLogger.info("Category status toggled", {
    categoryId: category.id,
    isActive: category.isActive,
  });

  return responseHandler.success(res, category, "Category status toggled successfully");
});

// ============================================
// CATEGORY LEVEL 1 MANAGEMENT
// ============================================

export const getAllCategoryLevel1 = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    categoryId,
    isActive,
    sortBy = "displayOrder",
    order = "ASC",
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const queryBuilder = CategoryLevel1Repo.createQueryBuilder("level1")
    .leftJoinAndSelect("level1.category", "category")
    .leftJoinAndSelect("level1.children", "level2", "level2.isActive = :childActive", {
      childActive: true,
    });

  if (categoryId) {
    queryBuilder.andWhere("level1.categoryId = :categoryId", { categoryId });
  }

  if (search) {
    queryBuilder.andWhere("(level1.name ILIKE :search OR level1.slug ILIKE :search)", {
      search: `%${search}%`,
    });
  }

  if (isActive !== undefined) {
    queryBuilder.andWhere("level1.isActive = :isActive", {
      isActive: isActive === "true",
    });
  }

  const total = await queryBuilder.getCount();

  const items = await queryBuilder
    .orderBy(`level1.${String(sortBy)}`, String(order).toUpperCase() as "ASC" | "DESC")
    .skip(skip)
    .take(Number(limit))
    .getMany();

  return responseHandler.success(
    res,
    {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
    "Category Level 1 items retrieved successfully",
  );
});

export const getCategoryLevel1ById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await CategoryLevel1Repo.createQueryBuilder("level1")
    .leftJoinAndSelect("level1.category", "category")
    .leftJoinAndSelect("level1.children", "level2")
    .where("level1.id = :id", { id })
    .getOne();

  if (!item) {
    return responseHandler.error(res, "Category Level 1 not found", 404);
  }

  return responseHandler.success(res, item, "Category Level 1 retrieved successfully");
});

export const createCategoryLevel1 = asyncHandler(async (req, res) => {
  const { categoryId, name, slug, description, displayOrder, isActive } = req.body;

  const parentCategory = await CategoryRepo.findOne({ where: { id: categoryId } });
  if (!parentCategory) {
    return responseHandler.error(res, "Parent category not found", 404);
  }

  const existing = await CategoryLevel1Repo.findOne({
    where: [
      { name, categoryId },
      { slug, categoryId },
    ],
  });

    if (existing) {
      return responseHandler.error(res, "Level 1 category with this name or slug already exists in this category", 409);
    }

  const item = new CategoryLevel1();
  item.category = parentCategory;
  item.categoryId = categoryId;
  item.name = name;
  item.slug = slug;
  item.description = description || null;
  item.displayOrder = displayOrder || 0;
  item.isActive = isActive ?? true;

  await CategoryLevel1Repo.save(item);

  auditLogger.info("Category Level 1 created", {
    level1Id: item.id,
    categoryId: item.categoryId,
    name: item.name,
  });

  return responseHandler.success(res, item, "Category Level 1 created successfully", 201);
});

export const updateCategoryLevel1 = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, slug, description, displayOrder, isActive } = req.body;

  const item = await CategoryLevel1Repo.findOne({ where: { id } });

  if (!item) {
    return responseHandler.error(res, "Category Level 1 not found", 404);
  }

  if (name || slug) {
    const existing = await CategoryLevel1Repo.createQueryBuilder("level1")
      .where(
        "(level1.name = :name OR level1.slug = :slug) AND level1.categoryId = :categoryId AND level1.id != :id",
        {
          name: name || item.name,
          slug: slug || item.slug,
          categoryId: item.categoryId,
          id,
        },
      )
      .getOne();

    if (existing) {
      return responseHandler.error(res, "Level 1 category with this name or slug already exists in this category", 409);
    }
  }

  if (name) item.name = name;
  if (slug) item.slug = slug;
  if (description !== undefined) item.description = description || null;
  if (displayOrder !== undefined) item.displayOrder = displayOrder;
  if (isActive !== undefined) item.isActive = isActive;

  await CategoryLevel1Repo.save(item);

  auditLogger.info("Category Level 1 updated", {
    level1Id: item.id,
    name: item.name,
  });

  return responseHandler.success(res, item, "Category Level 1 updated successfully");
});

export const deleteCategoryLevel1 = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await CategoryLevel1Repo.findOne({
    where: { id },
    relations: ["children"],
  });

  if (!item) {
    return responseHandler.error(res, "Category Level 1 not found", 404);
  }

  if (item.children && item.children.length > 0) {
    return responseHandler.error(res, "Cannot delete this category. Delete all Level 2 categories first.", 400);
  }

  await CategoryLevel1Repo.remove(item);

  auditLogger.info("Category Level 1 deleted", {
    level1Id: item.id,
    name: item.name,
  });

  return responseHandler.success(res, null, "Category Level 1 deleted successfully");
});

export const toggleCategoryLevel1Status = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await CategoryLevel1Repo.findOne({ where: { id } });

  if (!item) {
    return responseHandler.error(res, "Category Level 1 not found", 404);
  }

  item.isActive = !item.isActive;
  await CategoryLevel1Repo.save(item);

  auditLogger.info("Category Level 1 status toggled", {
    level1Id: item.id,
    isActive: item.isActive,
  });

  return responseHandler.success(res, item, "Category Level 1 status toggled successfully");
});

// ============================================
// CATEGORY LEVEL 2 MANAGEMENT
// ============================================

export const getAllCategoryLevel2 = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    categoryId,
    categoryLevel1Id,
    isActive,
    sortBy = "displayOrder",
    order = "ASC",
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const queryBuilder = CategoryLevel2Repo.createQueryBuilder("level2")
    .leftJoinAndSelect("level2.categoryLevel1", "level1")
    .leftJoinAndSelect("level1.category", "category");

  if (categoryId) {
    queryBuilder.andWhere("level2.categoryId = :categoryId", { categoryId });
  }

  if (categoryLevel1Id) {
    queryBuilder.andWhere("level2.categoryLevel1Id = :categoryLevel1Id", {
      categoryLevel1Id,
    });
  }

  if (search) {
    queryBuilder.andWhere("(level2.name ILIKE :search OR level2.slug ILIKE :search)", {
      search: `%${search}%`,
    });
  }

  if (isActive !== undefined) {
    queryBuilder.andWhere("level2.isActive = :isActive", {
      isActive: isActive === "true",
    });
  }

  const total = await queryBuilder.getCount();

  const items = await queryBuilder
    .orderBy(`level2.${String(sortBy)}`, String(order).toUpperCase() as "ASC" | "DESC")
    .skip(skip)
    .take(Number(limit))
    .getMany();

  return responseHandler.success(
    res,
    {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
    "Category Level 2 items retrieved successfully",
  );
});

export const getCategoryLevel2ById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await CategoryLevel2Repo.createQueryBuilder("level2")
    .leftJoinAndSelect("level2.categoryLevel1", "level1")
    .leftJoinAndSelect("level1.category", "category")
    .where("level2.id = :id", { id })
    .getOne();

  if (!item) {
    return responseHandler.error(res, "Category Level 2 not found", 404);
  }

  return responseHandler.success(res, item, "Category Level 2 retrieved successfully");
});

export const createCategoryLevel2 = asyncHandler(async (req, res) => {
  const { categoryId, categoryLevel1Id, name, slug, description, displayOrder, isActive } =
    req.body;

  const parentLevel1 = await CategoryLevel1Repo.findOne({
    where: { id: categoryLevel1Id },
  });

  if (!parentLevel1) {
    return responseHandler.error(res, "Parent Category Level 1 not found", 404);
  }

  if (parentLevel1.categoryId !== categoryId) {
    return responseHandler.error(res, "Category mismatch", 400);
  }

  const existing = await CategoryLevel2Repo.findOne({
    where: [
      { name, categoryLevel1Id },
      { slug, categoryLevel1Id },
    ],
  });

  if (existing) {
    return responseHandler.error(res, "Level 2 category with this name or slug already exists in this Level 1 category", 409);
  }

  const item = new CategoryLevel2();
  item.categoryLevel1 = parentLevel1;
  item.categoryLevel1Id = categoryLevel1Id;
  item.categoryId = categoryId;
  item.name = name;
  item.slug = slug;
  item.description = description || null;
  item.displayOrder = displayOrder || 0;
  item.isActive = isActive ?? true;

  await CategoryLevel2Repo.save(item);

  auditLogger.info("Category Level 2 created", {
    level2Id: item.id,
    categoryLevel1Id: item.categoryLevel1Id,
    categoryId: item.categoryId,
    name: item.name,
  });

  return responseHandler.success(res, item, "Category Level 2 created successfully", 201);
});

export const updateCategoryLevel2 = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, slug, description, displayOrder, isActive } = req.body;

  const item = await CategoryLevel2Repo.findOne({ where: { id } });

  if (!item) {
    return responseHandler.error(res, "Category Level 2 not found", 404);
  }

  if (name || slug) {
    const existing = await CategoryLevel2Repo.createQueryBuilder("level2")
      .where(
        "(level2.name = :name OR level2.slug = :slug) AND level2.categoryLevel1Id = :categoryLevel1Id AND level2.id != :id",
        {
          name: name || item.name,
          slug: slug || item.slug,
          categoryLevel1Id: item.categoryLevel1Id,
          id,
        },
      )
      .getOne();

    if (existing) {
      return responseHandler.error(res, "Level 2 category with this name or slug already exists in this Level 1 category", 409);
    }
  }

  if (name) item.name = name;
  if (slug) item.slug = slug;
  if (description !== undefined) item.description = description || null;
  if (displayOrder !== undefined) item.displayOrder = displayOrder;
  if (isActive !== undefined) item.isActive = isActive;

  await CategoryLevel2Repo.save(item);

  auditLogger.info("Category Level 2 updated", {
    level2Id: item.id,
    name: item.name,
  });

  return responseHandler.success(res, item, "Category Level 2 updated successfully");
});

export const deleteCategoryLevel2 = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await CategoryLevel2Repo.findOne({ where: { id } });

  if (!item) {
    return responseHandler.error(res, "Category Level 2 not found", 404);
  }

  await CategoryLevel2Repo.remove(item);

  auditLogger.info("Category Level 2 deleted", {
    level2Id: item.id,
    name: item.name,
  });

  return responseHandler.success(res, null, "Category Level 2 deleted successfully");
});

export const toggleCategoryLevel2Status = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await CategoryLevel2Repo.findOne({ where: { id } });

  if (!item) {
    return responseHandler.error(res, "Category Level 2 not found", 404);
  }

  item.isActive = !item.isActive;
  await CategoryLevel2Repo.save(item);

  auditLogger.info("Category Level 2 status toggled", {
    level2Id: item.id,
    isActive: item.isActive,
  });

  return responseHandler.success(res, item, "Category Level 2 status toggled successfully");
});
