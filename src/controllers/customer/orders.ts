import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import {
  OrderRepo,
  OrderLineItemRepo,
  CartRepo,
  CartItemRepo,
} from "@/models/repositories";
import { orderSchemas, OrderStatus, PaymentStatus, PaymentMethod } from "@/models/order";
import {
  generateOrderNumber,
  formatOrderNumber,
  isValidStatusTransition,
} from "@/models/order/utils";

export const listOrders = asyncHandler(async (req, res) => {
  const userId = (req.user as any).id as string;
  const { page = 1, limit = 20, status } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const qb = OrderRepo.createQueryBuilder("order")
    .where("order.userId = :userId", { userId })
    .leftJoinAndSelect("order.lineItems", "lineItems")
    .leftJoinAndSelect("order.deliveryHistory", "deliveryHistory")
    .skip(skip)
    .take(Number(limit));

  if (status) {
    qb.andWhere("order.status = :status", { status });
  }

  const [orders, total] = await qb
    .orderBy("order.createdAt", "DESC")
    .getManyAndCount();

  return responseHandler.success(
    res,
    {
      orders: orders.map((o) => ({
        ...o,
        orderNumber: formatOrderNumber(o.orderNumber),
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
    "Orders retrieved",
  );
});

export const getOrder = asyncHandler(async (req, res) => {
  const userId = (req.user as any).id as string;
  const { id } = req.params;

  const order = await OrderRepo.findOne({
    where: { id, userId },
    relations: ["lineItems", "deliveryHistory"],
  });

  if (!order) return responseHandler.error(res, "Order not found", 404);

  return responseHandler.success(
    res,
    {
      ...order,
      orderNumber: formatOrderNumber(order.orderNumber),
    },
    "Order retrieved",
  );
});

export const createOrder = asyncHandler(async (req, res) => {
  const userId = (req.user as any).id as string;
  const payload = req.body as any;

  await orderSchemas.create.validateAsync(payload);

  const cart = await CartRepo.findOne({
    where: { userId },
    relations: ["items", "items.product"],
  });

  if (!cart || cart.items.length === 0) {
    return responseHandler.error(res, "Cart is empty", 400);
  }

  if (!payload.deliveryAddress && !cart.deliveryAddress) {
    return responseHandler.error(res, "Delivery address is required", 400);
  }

  const orderNumber = await generateOrderNumber();

  const order = OrderRepo.create({
    orderNumber,
    userId,
    status: OrderStatus.PENDING,
    deliveryAddress: payload.deliveryAddress || cart.deliveryAddress,
    payment: {
      method: PaymentMethod.COD,
      status: PaymentStatus.PENDING,
    },
    customerNote: payload.customerNote,
    subtotal: Number(cart.subtotal),
    deliveryCharge: Number(cart.deliveryCharge),
    taxAmount: Number(cart.taxAmount),
    totalAmount: Number(cart.totalAmount),
  });

  const savedOrder = await OrderRepo.save(order);

  const lineItems = cart.items.map((item: any) => {
    const product = item.product;
    return OrderLineItemRepo.create({
      orderId: savedOrder.id,
      productId: item.productId,
      productSnapshot: {
        name: product.name,
        sku: product.sku,
        price: product.price,
        discount: product.discount,
        brand: product.brand,
        fatContent: product.fatContent,
        shelfLife: product.shelfLife,
        weight: product.weight,
        categoryLevel2Id: product.categoryLevel2Id,
        snapshotTimestamp: new Date(),
      },
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      totalPrice: Number(item.totalPrice),
    });
  });

  await OrderLineItemRepo.save(lineItems);

  // Clear cart after order creation
  await CartItemRepo.delete({ cartId: cart.id });
  await CartRepo.remove(cart);

  const createdOrder = await OrderRepo.findOne({
    where: { id: savedOrder.id },
    relations: ["lineItems"],
  });

  return responseHandler.success(
    res,
    {
      ...createdOrder,
      orderNumber: formatOrderNumber(createdOrder!.orderNumber),
    },
    "Order created successfully",
    201,
  );
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const userId = (req.user as any).id as string;
  const { id } = req.params;
  const payload = req.body as any;

  await orderSchemas.cancel.validateAsync(payload);

  const order = await OrderRepo.findOne({ where: { id, userId } });

  if (!order) return responseHandler.error(res, "Order not found", 404);

  if (
    ![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)
  ) {
    return responseHandler.error(res, "Order cannot be cancelled at this stage", 400);
  }

  if (!isValidStatusTransition(order.status, OrderStatus.CANCELLED)) {
    return responseHandler.error(res, "Invalid status transition", 400);
  }

  order.status = OrderStatus.CANCELLED;
  order.cancelledBy = payload.cancelledBy;
  order.cancellationReason = payload.reason;

  await OrderRepo.save(order);

  return responseHandler.success(
    res,
    {
      ...order,
      orderNumber: formatOrderNumber(order.orderNumber),
    },
    "Order cancelled",
  );
});

export const getOrderTracking = asyncHandler(async (req, res) => {
  const userId = (req.user as any).id as string;
  const { id } = req.params;

  const order = await OrderRepo.findOne({
    where: { id, userId },
    relations: ["deliveryHistory"],
  });

  if (!order) return responseHandler.error(res, "Order not found", 404);

  const timeline = order.deliveryHistory.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return responseHandler.success(
    res,
    {
      orderNumber: formatOrderNumber(order.orderNumber),
      status: order.status,
      currentLocation: timeline[timeline.length - 1]?.location || null,
      timeline,
    },
    "Order tracking retrieved",
  );
});

export default {
  listOrders,
  getOrder,
  createOrder,
  cancelOrder,
  getOrderTracking,
};
