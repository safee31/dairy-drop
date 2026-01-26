import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { securityAuditService } from "@/utils/security";
import AppDataSource from "@/config/database";
import {
  OrderRepo,
  OrderLineItemRepo,
  CartRepo,
  AddressRepo,
} from "@/models/repositories";
import { orderSchemas, OrderStatus, PaymentStatus, PaymentMethod } from "@/models/order";
import {
  generateOrderNumber,
  isValidStatusTransition,
  canCustomerCancelOrder,
} from "@/models/order/utils";
import { calculateCartTotals } from "@/models/cart/utils";
import { sendOrderStatusNotification } from "@/utils/emailService";

export const listOrders = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { page = 1, limit = 20, status } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const qb = OrderRepo.createQueryBuilder("order")
    .select([
      "order.id",
      "order.orderNumber",
      "order.status",
      "order.deliveryStatus",
      "order.totalAmount",
      "order.createdAt",
      "order.updatedAt",
    ])
    .where("order.userId = :userId", { userId })
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
      orders,
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
  const userId = req.user?.userId;
  const { id } = req.params;

  // Get order with all related data populated
  const order = await OrderRepo.createQueryBuilder("order")
    .where("order.id = :id AND order.userId = :userId", { id, userId })
    // Populate lineItems with product snapshot
    .leftJoinAndSelect("order.lineItems", "lineItems")
    // Populate delivery history
    .leftJoinAndSelect("order.deliveryHistory", "deliveryHistory")
    .orderBy("deliveryHistory.createdAt", "DESC")
    .getOne();

  if (!order) return responseHandler.error(res, "Order not found", 404);

  // Return complete order with all related data
  return responseHandler.success(
    res,
    {
      id: order.id,
      orderNumber: order.orderNumber, // Already formatted by subscriber
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      deliveryAddress: order.deliveryAddress,
      payment: order.payment,
      subtotal: order.subtotal,
      deliveryCharge: order.deliveryCharge,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      customerNote: order.customerNote,
      adminNote: order.adminNote,
      deliveredAt: order.deliveredAt,
      cancelledBy: order.cancelledBy,
      cancellationReason: order.cancellationReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // Populated relations
      lineItems: order.lineItems || [],
      deliveryHistory: order.deliveryHistory || [],
    },
    "Order retrieved",
  );
});

export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const incomingPayload = req.body as any;

  // Start transaction
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Fetch cart with items and product images (within transaction)
    const cart = await queryRunner.manager.findOne(CartRepo.target, {
      where: { userId },
      relations: ["items", "items.product", "items.product.images"],
    });

    if (!cart || cart.items.length === 0) {
      await queryRunner.rollbackTransaction();
      return responseHandler.error(res, "Cart is empty", 400);
    }

    // Filter out deleted products from cart items
    const activeCartItems = cart.items.filter((item: any) => !item.product?.isDeleted);
    
    if (activeCartItems.length === 0) {
      await queryRunner.rollbackTransaction();
      return responseHandler.error(res, "No valid items in cart", 400);
    }

    // Use only active items for order creation
    const itemsForOrder = activeCartItems;

    // Fetch address by ID (within transaction)
    const address = await queryRunner.manager.findOne(AddressRepo.target, {
      where: { id: incomingPayload.addressId, userId, isActive: true },
    });

    if (!address) {
      await queryRunner.rollbackTransaction();
      return responseHandler.error(res, "Invalid delivery address", 400);
    }

    // Build payload according to schema
    const payload = {
      deliveryAddress: {
        fullName: address.fullName,
        phone: address.phoneNumber || "",
        addressLine1: address.streetAddress,
        addressLine2: address.apartment || "",
        city: address.city,
        state: address.state || "",
        postalCode: address.postalCode,
        country: address.country,
      },
      customerNote: incomingPayload.customerNote?.trim() || "",
      items: itemsForOrder.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    // Validate against schema
    await orderSchemas.create.validateAsync(payload);

    const orderNumber = await generateOrderNumber();

    // Calculate totals using shared utility (filters deleted products automatically)
    const orderTotals = calculateCartTotals(
      itemsForOrder,
      cart.deliveryCharge || 0,
      cart.taxAmount || 0
    );

    // Create order using query runner
    const order = queryRunner.manager.create(OrderRepo.target, {
      orderNumber,
      userId,
      status: OrderStatus.PENDING,
      deliveryAddress: payload.deliveryAddress,
      payment: {
        method: PaymentMethod.COD,
        status: PaymentStatus.PENDING,
      },
      customerNote: payload.customerNote,
      subtotal: orderTotals.subtotal,
      deliveryCharge: orderTotals.deliveryCharge,
      taxAmount: orderTotals.taxAmount,
      totalAmount: orderTotals.totalAmount,
    });

    const savedOrder = await queryRunner.manager.save(order);

    // Create line items using query runner - only for active items
    const lineItems = itemsForOrder.map((item: any) => {
      const product = item.product;
      const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0];
      return queryRunner.manager.create(OrderLineItemRepo.target, {
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
          image: primaryImage ? {
            id: primaryImage.id,
            imageUrl: primaryImage.imageUrl,
            alt: primaryImage.alt,
          } : undefined,
          snapshotTimestamp: new Date(),
        },
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        totalPrice: Number(item.totalPrice),
      });
    });

    await queryRunner.manager.save(lineItems);

    // Note: Cart is intentionally NOT cleared after order creation
    // This allows customers to reorder or continue shopping with the same items
    // The cart will remain in the database for reference and convenience

    // Commit transaction
    await queryRunner.commitTransaction();

    // Fetch created order with relations (outside transaction)
    const createdOrder = await OrderRepo.findOne({
      where: { id: savedOrder.id },
      relations: ["lineItems"],
    });

    // Audit log: order creation
    securityAuditService.log("order:create", userId, {
      orderId: savedOrder.id,
      totalAmount: createdOrder!.totalAmount,
      itemCount: createdOrder!.lineItems.length,
      paymentMethod: PaymentMethod.COD,
    });

    return responseHandler.success(
      res,
      createdOrder,
      "Order created successfully",
      201,
    );
  } catch (error) {
    // Rollback on any error
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    // Release query runner
    await queryRunner.release();
  }
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;
  const payload = req.body as any;

  await orderSchemas.cancel.validateAsync(payload);

  const order = await OrderRepo.findOne({
    where: { id, userId },
    relations: ["user"],
  });

  if (!order) return responseHandler.error(res, "Order not found", 404);

  // Use validator to check if customer can cancel this order
  const cancellationCheck = canCustomerCancelOrder(order.status);

  if (!cancellationCheck.canCancel) {
    return responseHandler.error(res, cancellationCheck.message, 400);
  }

  // If it's a cut-off warning, include it but allow cancellation
  const validatorMessage = cancellationCheck.message || undefined;

  if (!isValidStatusTransition(order.status, OrderStatus.CANCELLED)) {
    return responseHandler.error(res, "Invalid status transition", 400);
  }

  order.status = OrderStatus.CANCELLED;
  order.cancelledBy = payload.cancelledBy;
  order.cancellationReason = payload.reason;

  const updatedOrder = await OrderRepo.save(order);

  // Audit log: order cancellation
  securityAuditService.log("order:cancel", userId, {
    orderId: id,
    reason: payload.reason,
    cancelledBy: payload.cancelledBy,
    validatorMessage,
  });

  // Send cancellation notification email with validator message
  try {
    await sendOrderStatusNotification(
      order.user?.email || "",
      order.orderNumber,
      order.user?.fullName || "Customer",
      OrderStatus.CANCELLED,
      order.totalAmount,
      payload.reason,
      validatorMessage,
    );
  } catch (err) {
    // Log error but don't fail the cancellation
    console.error("Failed to send cancellation notification:", err);
  }

  return responseHandler.success(res, updatedOrder, "Order cancelled");
});

export const getOrderTracking = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
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
      orderNumber: order.orderNumber, // Already formatted by subscriber
      status: order.status,
      currentLocation: timeline[timeline.length - 1]?.location || null,
      timeline,
    },
    "Order tracking retrieved",
  );
});

export const confirmOrder = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  const order = await OrderRepo.findOne({
    where: { id, userId },
    relations: ["lineItems"],
  });

  if (!order) return responseHandler.error(res, "Order not found", 404);

  if (order.status !== OrderStatus.PENDING) {
    return responseHandler.error(
      res,
      `Order cannot be confirmed. Current status: ${order.status}`,
      400,
    );
  }

  if (!isValidStatusTransition(order.status, OrderStatus.CONFIRMED)) {
    return responseHandler.error(res, "Invalid status transition", 400);
  }

  // Update order status to CONFIRMED
  order.status = OrderStatus.CONFIRMED;
  await OrderRepo.save(order);

  // Audit log: order confirmation
  securityAuditService.log("order:confirm", userId, {
    orderId: id,
    totalAmount: order.totalAmount,
    itemCount: order.lineItems.length,
    paymentMethod: order.payment.method,
  });

  return responseHandler.success(
    res,
    order,
    "Order confirmed successfully",
  );
});

export default {
  listOrders,
  getOrder,
  createOrder,
  confirmOrder,
  cancelOrder,
  getOrderTracking,
};
