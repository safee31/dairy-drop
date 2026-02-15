import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { ProductReviewRepo, OrderRepo, ProductRepo } from "@/models/repositories";
import { ReviewStatus } from "@/models/productReview";
import { OrderStatus } from "@/models/order";

const listMyReviews = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const queryBuilder = ProductReviewRepo.createQueryBuilder("review")
    .leftJoinAndSelect("review.product", "product")
    .leftJoinAndSelect("review.responses", "responses")
    .leftJoinAndSelect("responses.user", "responder")
    .where("review.userId = :userId", { userId });

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

const getOrderReviews = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { orderId } = req.params;

  const reviews = await ProductReviewRepo.createQueryBuilder("review")
    .leftJoinAndSelect("review.responses", "responses")
    .leftJoin("responses.user", "responder")
    .addSelect(["responder.id", "responder.fullName"])
    .where("review.orderId = :orderId", { orderId })
    .andWhere("review.userId = :userId", { userId })
    .orderBy("review.createdAt", "DESC")
    .getMany();

  return responseHandler.success(res, reviews, "Order reviews retrieved");
});

const createReview = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { productId, orderId, rating, comment } = req.body;

  // Verify product exists
  const product = await ProductRepo.findOneBy({ id: productId, isActive: true });
  if (!product) {
    return responseHandler.notFound(res, "Product not found");
  }

  // Check for duplicate review (one review per product per user, or per order if provided)
  const duplicateWhere: any = { userId, productId };
  if (orderId) duplicateWhere.orderId = orderId;

  const existing = await ProductReviewRepo.findOneBy(duplicateWhere);
  if (existing) {
    return responseHandler.error(res, "You have already reviewed this product.", 409);
  }

  // Verify purchase if orderId provided
  let isVerifiedPurchase = false;
  if (orderId) {
    const order = await OrderRepo.findOne({
      where: { id: orderId, userId, status: OrderStatus.COMPLETED },
      relations: ["lineItems"],
    });

    if (!order) {
      return responseHandler.error(res, "Order not found or not completed.", 400);
    }

    const hasProduct = order.lineItems.some((item: any) => item.productId === productId);
    if (!hasProduct) {
      return responseHandler.error(res, "This product was not part of the order.", 400);
    }

    isVerifiedPurchase = true;
  }

  const review = ProductReviewRepo.create({
    productId,
    userId,
    orderId: orderId || null,
    rating,
    comment,
    status: ReviewStatus.PENDING,
    isVerifiedPurchase,
  });

  const saved = await ProductReviewRepo.save(review);

  return responseHandler.success(
    res,
    {
      id: saved.id,
      productId: saved.productId,
      rating: saved.rating,
      comment: saved.comment,
      status: saved.status,
      isVerifiedPurchase: saved.isVerifiedPurchase,
      createdAt: saved.createdAt,
    },
    "Review submitted successfully",
    201,
  );
});

const updateReview = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;
  const { rating, comment } = req.body;

  const review = await ProductReviewRepo.findOneBy({ id, userId } as any);
  if (!review) {
    return responseHandler.notFound(res, "Review not found");
  }

  // Only allow editing pending reviews
  if ((review as any).status !== ReviewStatus.PENDING) {
    return responseHandler.error(res, "Only pending reviews can be edited.", 400);
  }

  if (rating !== undefined) (review as any).rating = rating;
  if (comment !== undefined) (review as any).comment = comment;

  const updated = await ProductReviewRepo.save(review);

  return responseHandler.success(res, updated, "Review updated");
});

const deleteReview = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  const review = await ProductReviewRepo.findOneBy({ id, userId } as any);
  if (!review) {
    return responseHandler.notFound(res, "Review not found");
  }

  await ProductReviewRepo.remove(review);

  return responseHandler.success(res, {}, "Review deleted");
});

export default {
  listMyReviews,
  getOrderReviews,
  createReview,
  updateReview,
  deleteReview,
};
