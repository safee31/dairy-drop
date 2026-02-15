import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { ProductReviewRepo, ReviewResponseRepo } from "@/models/repositories";

const listAllReviews = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    status,
    productId,
    rating,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const queryBuilder = ProductReviewRepo.createQueryBuilder("review")
    .leftJoin("review.product", "product")
    .leftJoin("review.user", "user")
    .loadRelationCountAndMap("review.responsesCount", "review.responses")
    .select([
      "review.id",
      "review.rating",
      "review.status",
      "review.isVerifiedPurchase",
      "review.createdAt",
      "product.id",
      "product.name",
      "user.id",
      "user.fullName",
    ]);

  if (search) {
    queryBuilder.andWhere(
      "(user.fullName ILIKE :search OR product.name ILIKE :search OR review.comment ILIKE :search)",
      { search: `%${search}%` },
    );
  }

  if (status) {
    queryBuilder.andWhere("review.status = :status", { status });
  }

  if (productId) {
    queryBuilder.andWhere("review.productId = :productId", { productId });
  }

  if (rating) {
    queryBuilder.andWhere("review.rating = :rating", { rating: Number(rating) });
  }

  const total = await queryBuilder.getCount();

  const reviews = await queryBuilder
    .orderBy(`review.${String(sortBy)}`, String(sortOrder).toUpperCase() as "ASC" | "DESC")
    .skip(skip)
    .take(Number(limit))
    .getMany();

  return responseHandler.success(
    res,
    {
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
    "Reviews retrieved",
  );
});

const getReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await ProductReviewRepo.createQueryBuilder("review")
    .leftJoin("review.product", "product")
    .leftJoin("review.user", "user")
    .leftJoin("review.order", "order")
    .leftJoinAndSelect("review.responses", "responses")
    .leftJoin("responses.user", "responder")
    .select([
      "review.id",
      "review.rating",
      "review.comment",
      "review.status",
      "review.isVerifiedPurchase",
      "review.createdAt",
      "review.updatedAt",
      "product.id",
      "product.name",
      "user.id",
      "user.fullName",
      "user.email",
      "order.id",
      "order.orderNumber",
      "responses.id",
      "responses.responseText",
      "responses.createdAt",
      "responder.id",
      "responder.fullName",
    ])
    .where("review.id = :id", { id })
    .getOne();

  if (!review) {
    return responseHandler.notFound(res, "Review not found");
  }

  return responseHandler.success(res, review, "Review retrieved");
});

const updateReviewStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const review = await ProductReviewRepo.findOneBy({ id } as any);
  if (!review) {
    return responseHandler.notFound(res, "Review not found");
  }

  (review as any).status = status;
  const updated = await ProductReviewRepo.save(review);

  return responseHandler.success(res, updated, "Review status updated");
});

const createResponse = asyncHandler(async (req, res) => {
  const adminUserId = req.user?.userId;
  const { id } = req.params;
  const { responseText } = req.body;

  const review = await ProductReviewRepo.findOneBy({ id } as any);
  if (!review) {
    return responseHandler.notFound(res, "Review not found");
  }

  const response = ReviewResponseRepo.create({
    reviewId: id,
    userId: adminUserId,
    responseText,
  });

  const saved = await ReviewResponseRepo.save(response);

  return responseHandler.success(
    res,
    {
      id: saved.id,
      reviewId: (saved as any).reviewId,
      responseText: (saved as any).responseText,
      createdAt: saved.createdAt,
    },
    "Response added",
    201,
  );
});

const deleteResponse = asyncHandler(async (req, res) => {
  const { id, responseId } = req.params;

  const review = await ProductReviewRepo.findOneBy({ id } as any);
  if (!review) {
    return responseHandler.notFound(res, "Review not found");
  }

  const response = await ReviewResponseRepo.findOneBy({ id: responseId, reviewId: id } as any);
  if (!response) {
    return responseHandler.notFound(res, "Response not found");
  }

  await ReviewResponseRepo.remove(response);

  return responseHandler.success(res, {}, "Response deleted");
});

const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await ProductReviewRepo.findOneBy({ id } as any);
  if (!review) {
    return responseHandler.notFound(res, "Review not found");
  }

  await ProductReviewRepo.remove(review);

  return responseHandler.success(res, {}, "Review deleted");
});

export default {
  listAllReviews,
  getReview,
  updateReviewStatus,
  createResponse,
  deleteResponse,
  deleteReview,
};
