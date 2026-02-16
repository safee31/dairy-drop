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
} from "@/models/repositories";
import { OrderStatus } from "@/models/order/entity";

const getOverview = asyncHandler(async (_req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalOrders,
    totalCustomers,
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
  ] = await Promise.all([
    // Total orders
    OrderRepo.count(),

    // Total customers (role type 2)
    UserRepo.createQueryBuilder("u")
      .innerJoin("u.role", "r")
      .where("r.type = :type", { type: 2 })
      .getCount(),

    // Active products
    ProductRepo.count({ where: { isActive: true, isDeleted: false } }),

    // Total active categories
    CategoryRepo.count({ where: { isActive: true } }),

    // Total revenue (completed orders)
    OrderRepo.createQueryBuilder("o")
      .select("COALESCE(SUM(o.totalAmount), 0)", "total")
      .where("o.status = :status", { status: OrderStatus.COMPLETED })
      .getRawOne(),

    // Recent 5 orders with user
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
      .orderBy("o.createdAt", "DESC")
      .limit(5)
      .getMany(),

    // Orders grouped by status
    OrderRepo.createQueryBuilder("o")
      .select("o.status", "status")
      .addSelect("COUNT(*)::int", "count")
      .groupBy("o.status")
      .getRawMany(),

    // Delivery status breakdown
    OrderRepo.createQueryBuilder("o")
      .select("o.deliveryStatus", "status")
      .addSelect("COUNT(*)::int", "count")
      .where("o.deliveryStatus IS NOT NULL")
      .groupBy("o.deliveryStatus")
      .getRawMany(),

    // Low stock count
    InventoryRepo.createQueryBuilder("inv")
      .where(`"inv"."stockQuantity" <= "inv"."reorderLevel"`)
      .andWhere(`"inv"."inStock" = true`)
      .getCount(),

    // Out of stock count
    InventoryRepo.count({ where: { inStock: false } }),

    // Revenue by day (last 30 days)
    OrderRepo.createQueryBuilder("o")
      .select(`"o"."createdAt"::date`, "date")
      .addSelect(`COALESCE(SUM("o"."totalAmount"), 0)::numeric(10,2)`, "revenue")
      .addSelect("COUNT(*)::int", "orders")
      .where(`"o"."createdAt" >= :since`, { since: thirtyDaysAgo })
      .andWhere("o.status != :cancelled", { cancelled: OrderStatus.CANCELLED })
      .groupBy(`"o"."createdAt"::date`)
      .orderBy(`"o"."createdAt"::date`, "ASC")
      .getRawMany(),

    // Top 5 selling products (by quantity)
    OrderLineItemRepo.createQueryBuilder("li")
      .select(`"li"."productSnapshot" ->> 'name'`, "name")
      .addSelect(`SUM("li"."quantity")::int`, "totalQuantity")
      .addSelect(`SUM("li"."totalPrice")::numeric(10,2)`, "totalRevenue")
      .groupBy(`"li"."productSnapshot" ->> 'name'`)
      .orderBy(`SUM("li"."quantity")`, "DESC")
      .limit(5)
      .getRawMany(),

    // Recent 5 reviews with user + product
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
      .orderBy("rv.createdAt", "DESC")
      .limit(5)
      .getMany(),

    // Review stats
    ProductReviewRepo.createQueryBuilder("rv")
      .select("ROUND(COALESCE(AVG(rv.rating), 0), 1)::numeric", "avgRating")
      .addSelect("COUNT(*)::int", "total")
      .addSelect("COUNT(*) FILTER (WHERE rv.status = 'pending')::int", "pending")
      .addSelect("COUNT(*) FILTER (WHERE rv.status = 'approved')::int", "approved")
      .addSelect("COUNT(*) FILTER (WHERE rv.status = 'rejected')::int", "rejected")
      .getRawOne(),

    // New customers in last 30 days
    UserRepo.createQueryBuilder("u")
      .innerJoin("u.role", "r")
      .where("r.type = :type", { type: 2 })
      .andWhere("u.createdAt >= :since", { since: thirtyDaysAgo })
      .getCount(),

    // Pending payment total (JSONB field)
    OrderRepo.createQueryBuilder("o")
      .select("COALESCE(SUM(o.totalAmount), 0)::numeric(10,2)", "total")
      .addSelect("COUNT(*)::int", "count")
      .where("o.payment ->> 'status' = :pstatus", { pstatus: "pending" })
      .andWhere("o.status != :cancelled", { cancelled: OrderStatus.CANCELLED })
      .getRawOne(),
  ]);

  // Transform grouped results
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
      totalCustomers,
      totalProducts,
      totalCategories,
      totalRevenue: parseFloat(revenueResult?.total || "0"),
      newCustomersCount,
      lowStockCount,
      outOfStockCount,
      ordersByStatus: toMap(ordersByStatusRaw),
      deliveryStatusBreakdown: toMap(deliveryStatusRaw),
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
