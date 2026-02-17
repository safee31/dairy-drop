import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import {
  OrderRepo,
  OrderLineItemRepo,
  UserRepo,
  ProductRepo,
  ProductReviewRepo,
  InventoryRepo,
  CategoryRepo,
  RefundRepo,
} from "@/models/repositories";
import { OrderStatus } from "@/models/order/entity";
import { RefundStatus } from "@/models/refund/entity";

const getOverview = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 6);

  const from = req.query.from
    ? (req.query.from as string).slice(0, 10)
    : defaultFrom.toISOString().slice(0, 10);
  const to = req.query.to
    ? (req.query.to as string).slice(0, 10)
    : today;

  const dateBetween = `"createdAt"::date BETWEEN :from AND :to`;

  const [
    totalOrders,
    totalProducts,
    totalCategories,
    revenueResult,
    recentOrders,
    ordersByStatusRaw,
    deliveryStatusRaw,
    lowStockCount,
    outOfStockCount,
    revenueByDayRaw,
    topProductsRaw,
    recentReviews,
    reviewStatsRaw,
    newCustomersCount,
    pendingPaymentResult,
    totalRefundedResult,
    refundStatusCountsRaw,
  ] = await Promise.all([
    OrderRepo.createQueryBuilder("o")
      .where(`"o".${dateBetween}`, { from, to })
      .getCount(),

    ProductRepo.count({ where: { isActive: true, isDeleted: false } }),

    CategoryRepo.count({ where: { isActive: true } }),

    OrderRepo.createQueryBuilder("o")
      .select("COALESCE(SUM(o.totalAmount), 0)", "total")
      .where("o.status = :status", { status: OrderStatus.COMPLETED })
      .andWhere(`"o".${dateBetween}`, { from, to })
      .getRawOne(),

    OrderRepo.createQueryBuilder("o")
      .leftJoin("o.user", "u")
      .select([
        "o.id",
        "o.orderNumber",
        "o.status",
        "o.deliveryStatus",
        "o.totalAmount",
        "o.createdAt",
        "u.id",
        "u.fullName",
        "u.email",
      ])
      .where(`"o".${dateBetween}`, { from, to })
      .orderBy("o.createdAt", "DESC")
      .limit(5)
      .getMany(),

    OrderRepo.createQueryBuilder("o")
      .select("o.status", "status")
      .addSelect("COUNT(*)::int", "count")
      .where(`"o".${dateBetween}`, { from, to })
      .groupBy("o.status")
      .getRawMany(),

    OrderRepo.createQueryBuilder("o")
      .select("o.deliveryStatus", "status")
      .addSelect("COUNT(*)::int", "count")
      .where(`"o".${dateBetween}`, { from, to })
      .andWhere("o.deliveryStatus IS NOT NULL")
      .groupBy("o.deliveryStatus")
      .getRawMany(),

    InventoryRepo.createQueryBuilder("inv")
      .where(`"inv"."stockQuantity" <= "inv"."reorderLevel"`)
      .andWhere(`"inv"."inStock" = true`)
      .getCount(),

    InventoryRepo.count({ where: { inStock: false } }),

    OrderRepo.createQueryBuilder("o")
      .select(`"o"."createdAt"::date`, "date")
      .addSelect(`COALESCE(SUM("o"."totalAmount"), 0)::numeric(10,2)`, "revenue")
      .addSelect("COUNT(*)::int", "orders")
      .where(`"o".${dateBetween}`, { from, to })
      .andWhere("o.status != :cancelled", { cancelled: OrderStatus.CANCELLED })
      .groupBy(`"o"."createdAt"::date`)
      .orderBy(`"o"."createdAt"::date`, "ASC")
      .getRawMany(),

    OrderLineItemRepo.createQueryBuilder("li")
      .innerJoin("li.order", "o")
      .select(`"li"."productSnapshot" ->> 'name'`, "name")
      .addSelect(`SUM("li"."quantity")::int`, "totalQuantity")
      .addSelect(`SUM("li"."totalPrice")::numeric(10,2)`, "totalRevenue")
      .where(`"o".${dateBetween}`, { from, to })
      .groupBy(`"li"."productSnapshot" ->> 'name'`)
      .orderBy(`SUM("li"."quantity")`, "DESC")
      .limit(5)
      .getRawMany(),

    ProductReviewRepo.createQueryBuilder("rv")
      .leftJoin("rv.user", "u")
      .leftJoin("rv.product", "p")
      .select([
        "rv.id",
        "rv.rating",
        "rv.comment",
        "rv.status",
        "rv.createdAt",
        "u.id",
        "u.fullName",
        "p.id",
        "p.name",
      ])
      .where(`"rv".${dateBetween}`, { from, to })
      .orderBy("rv.createdAt", "DESC")
      .limit(5)
      .getMany(),

    ProductReviewRepo.createQueryBuilder("rv")
      .select("ROUND(COALESCE(AVG(rv.rating), 0), 1)::numeric", "avgRating")
      .addSelect("COUNT(*)::int", "total")
      .addSelect("COUNT(*) FILTER (WHERE rv.status = 'pending')::int", "pending")
      .addSelect("COUNT(*) FILTER (WHERE rv.status = 'approved')::int", "approved")
      .addSelect("COUNT(*) FILTER (WHERE rv.status = 'rejected')::int", "rejected")
      .where(`"rv".${dateBetween}`, { from, to })
      .getRawOne(),

    UserRepo.createQueryBuilder("u")
      .innerJoin("u.role", "r")
      .where("r.type = :type", { type: 2 })
      .andWhere(`"u".${dateBetween}`, { from, to })
      .getCount(),

    OrderRepo.createQueryBuilder("o")
      .select("COALESCE(SUM(o.totalAmount), 0)::numeric(10,2)", "total")
      .addSelect("COUNT(*)::int", "count")
      .where("o.payment ->> 'status' = :pstatus", { pstatus: "pending" })
      .andWhere("o.status != :cancelled", { cancelled: OrderStatus.CANCELLED })
      .andWhere(`"o".${dateBetween}`, { from, to })
      .getRawOne(),

    RefundRepo.createQueryBuilder("r")
      .select("COALESCE(SUM(r.amount), 0)::numeric(10,2)", "total")
      .where("r.status = :completedStatus", { completedStatus: RefundStatus.COMPLETED })
      .andWhere(`r."refundPayment" ->> 'status' = :paymentCompleted`, { paymentCompleted: "completed" })
      .andWhere(`"r".${dateBetween}`, { from, to })
      .getRawOne(),

    RefundRepo.createQueryBuilder("r")
      .select("r.status", "status")
      .addSelect("COUNT(*)::int", "count")
      .where(`"r".${dateBetween}`, { from, to })
      .groupBy("r.status")
      .getRawMany(),

  ]);

  const toMap = (rows: { status: string; count: number }[]) =>
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = r.count;
      return acc;
    }, {});

  const revenueByDay = revenueByDayRaw.map(
    (r: { date: string; revenue: string; orders: number }) => ({
      date: r.date,
      revenue: parseFloat(r.revenue),
      orders: r.orders,
    }),
  );

  const topProducts = topProductsRaw.map(
    (r: { name: string; totalQuantity: number; totalRevenue: string }) => ({
      name: r.name,
      totalQuantity: r.totalQuantity,
      totalRevenue: parseFloat(r.totalRevenue),
    }),
  );

  return responseHandler.success(
    res,
    {
      totalOrders,
      totalProducts,
      totalCategories,
      totalRevenue: parseFloat(revenueResult?.total || "0"),
      totalRefundedAmount: parseFloat(totalRefundedResult?.total || "0"),
      newCustomersCount,
      lowStockCount,
      outOfStockCount,
      ordersByStatus: toMap(ordersByStatusRaw),
      deliveryStatusBreakdown: toMap(deliveryStatusRaw),
      refundStatusCounts: toMap(refundStatusCountsRaw),
      revenueByDay,
      topProducts,
      recentOrders,
      recentReviews,
      reviewStats: {
        avgRating: parseFloat(reviewStatsRaw?.avgRating || "0"),
        total: reviewStatsRaw?.total || 0,
        pending: reviewStatsRaw?.pending || 0,
        approved: reviewStatsRaw?.approved || 0,
        rejected: reviewStatsRaw?.rejected || 0,
      },
      pendingPayments: {
        total: parseFloat(pendingPaymentResult?.total || "0"),
        count: pendingPaymentResult?.count || 0,
      },
    },
    "Dashboard overview retrieved successfully",
  );
});

export default { getOverview };
