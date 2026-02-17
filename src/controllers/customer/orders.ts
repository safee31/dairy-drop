import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { securityAuditService } from "@/utils/security";
import { transactionUtils } from "@/config/database";
import {
  OrderRepo,
  OrderLineItemRepo,
  CartRepo,
  CartItemRepo,
  AddressRepo,
  InventoryRepo,
  ProductRepo,
} from "@/models/repositories";
import { orderSchemas, OrderStatus, PaymentStatus, PaymentMethod } from "@/models/order";
import {
  generateOrderNumber,
  isValidStatusTransition,
  canCustomerCancelOrder,
} from "@/models/order/utils";
import { calculateCartTotals } from "@/models/cart/utils";
import { sendOrderStatusNotification } from "@/utils/emailService";

const listOrders = asyncHandler(async (req, res) => {
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

const getOrder = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  const order = await OrderRepo.createQueryBuilder("order")
    .where("order.id = :id AND order.userId = :userId", { id, userId })
    .leftJoinAndSelect("order.lineItems", "lineItems")
    .leftJoinAndSelect("order.deliveryHistory", "deliveryHistory")
    .orderBy("deliveryHistory.createdAt", "DESC")
    .getOne();

  if (!order) return responseHandler.error(res, "Order not found", 404);

  return responseHandler.success(
    res,
    {
      id: order.id,
      orderNumber: order.orderNumber,
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
      refundStatus: order.refundStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      lineItems: order.lineItems || [],
      deliveryHistory: order.deliveryHistory || [],
    },
    "Order retrieved",
  );
});

const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const incomingPayload = req.body as any;

  // Use transaction utility for cleaner transaction management
  const createdOrder = await transactionUtils.withQueryRunner(async (queryRunner) => {
    const manager = queryRunner.manager;

    const cart = await manager.findOne(CartRepo.target, {
      where: { userId },
      relations: ["items", "items.product", "items.product.images"],
    });

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Only process selected, non-deleted items
    const selectedItems = cart.items.filter(
      (item: any) => item.isSelected && !item.product?.isDeleted,
    );

    if (selectedItems.length === 0) {
      throw new Error("No selected items in cart");
    }

    // Validate each selected item: product active + stock sufficient
    const validationErrors: string[] = [];
    for (const item of selectedItems as any[]) {
      const product = await manager.findOne(ProductRepo.target, {
        where: { id: item.productId },
      });

      if (!product || product.isDeleted) {
        validationErrors.push(`"${item.product?.name || item.productId}" has been removed`);
        item.isSelected = false;
        await manager.save(CartItemRepo.target, item);
        continue;
      }

      if (!product.isActive) {
        validationErrors.push(`"${product.name}" is currently unavailable`);
        item.isSelected = false;
        await manager.save(CartItemRepo.target, item);
        continue;
      }

      const inventory = await manager.findOne(InventoryRepo.target, {
        where: { productId: item.productId },
      });

      if (!inventory || inventory.stockQuantity < item.quantity) {
        const available = inventory?.stockQuantity || 0;
        validationErrors.push(
          `"${product.name}" has insufficient stock (requested: ${item.quantity}, available: ${available})`,
        );
        continue;
      }
    }

    if (validationErrors.length > 0) {
      throw new Error(`Checkout validation failed: ${validationErrors.join("; ")}`);
    }

    const itemsForOrder = selectedItems;

    const address = await manager.findOne(AddressRepo.target, {
      where: { id: incomingPayload.addressId, userId, isActive: true },
    });

    if (!address) {
      throw new Error("Invalid delivery address");
    }

    const payload = {
      deliveryAddress: {
        fullName: address.fullName,
        phoneNumber: address.phoneNumber || "",
        streetAddress: address.streetAddress,
        apartment: address.apartment || "",
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

    await orderSchemas.create.validateAsync(payload);

    const orderNumber = await generateOrderNumber();

    // Calculate totals using shared utility (filters deleted products automatically)
    const orderTotals = calculateCartTotals(
      itemsForOrder,
      cart.deliveryCharge || 0,
      cart.taxAmount || 0
    );

    const order = manager.create(OrderRepo.target, {
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

    const savedOrder = await manager.save(order);

    const lineItems = itemsForOrder.map((item: any) => {
      const product = item.product;
      const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0];
      return manager.create(OrderLineItemRepo.target, {
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

    await manager.save(lineItems);

    // Remove only ordered items from cart, keep unselected items
    const orderedItemIds = itemsForOrder.map((item: any) => item.id);
    await manager.delete(CartItemRepo.target, orderedItemIds);

    // Recalculate cart totals for remaining items
    const remainingItems = cart.items.filter((item: any) => !orderedItemIds.includes(item.id));
    const totals = calculateCartTotals(remainingItems);
    cart.subtotal = Number(totals.subtotal);
    cart.deliveryCharge = Number(totals.deliveryCharge);
    cart.taxAmount = Number(totals.taxAmount);
    cart.totalAmount = Number(totals.totalAmount);
    cart.totalItems = totals.totalItems;
    cart.totalQuantity = totals.totalQuantity;
    await manager.save(CartRepo.target, cart);

    return savedOrder.id;
  });

  const result = await OrderRepo.findOne({
    where: { id: createdOrder },
    relations: ["lineItems"],
  });

  securityAuditService.log("order:create", userId, {
    orderId: result!.id,
    totalAmount: result!.totalAmount,
    itemCount: result!.lineItems.length,
    paymentMethod: PaymentMethod.COD,
  });

  return responseHandler.success(
    res,
    result,
    "Order created successfully",
    201,
  );
});

const cancelOrder = asyncHandler(async (req, res) => {
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

  sendOrderStatusNotification(
    order.user?.email || "",
    order.orderNumber,
    order.user?.fullName || "Customer",
    OrderStatus.CANCELLED,
    order.totalAmount,
    payload.reason,
    validatorMessage,
  ).catch((err) => console.error("Failed to send cancellation notification:", err));

  return responseHandler.success(res, updatedOrder, "Order cancelled");
});

const getOrderTracking = asyncHandler(async (req, res) => {
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

const confirmOrder = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  const order = await OrderRepo.findOne({
    where: { id, userId },
    relations: ["lineItems", "user"],
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

  order.status = OrderStatus.CONFIRMED;
  const savedOrder = await OrderRepo.save(order);

  securityAuditService.log("order:confirm", userId, {
    orderId: id,
    totalAmount: order.totalAmount,
    itemCount: order.lineItems.length,
    paymentMethod: order.payment.method,
  });

  sendOrderStatusNotification(
    order.user?.email || "",
    savedOrder.orderNumber,
    order.user?.fullName || "Customer",
    OrderStatus.CONFIRMED,
    savedOrder.totalAmount,
  ).catch((err) => console.error("Failed to send order confirmation notification:", err));

  return responseHandler.success(
    res,
    savedOrder,
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
