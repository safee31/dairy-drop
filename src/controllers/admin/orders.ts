import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import {
    OrderRepo,
    OrderDeliveryHistoryRepo,
} from "@/models/repositories";
import { OrderStatus, PaymentStatus } from "@/models/order";
import { DeliveryStatus } from "@/models/order/entity";
import orderDeliveryHistorySchemas from "@/models/order/orderdeliveryhistory.schema";
import {
    isValidStatusTransition,
    isValidDeliveryStatusTransition,
    validateOrderStatusTransition,
} from "@/models/order/utils";
import { sendDeliveryStatusNotification, sendOrderStatusNotification } from "@/utils/emailService";

export const listAllOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, status, deliveryStatus, search } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const qb = OrderRepo.createQueryBuilder("order")
        .leftJoinAndSelect("order.user", "user")
        .select([
            "order.id",
            "order.orderNumber",
            "order.status",
            "order.deliveryStatus",
            "order.totalAmount",
            "order.createdAt",
            "order.payment",
            "user.id",
            "user.fullName",
            "user.email",
        ])
        .skip(skip)
        .take(Number(limit));

    if (status) {
        qb.andWhere("order.status = :status", { status });
    }

    if (deliveryStatus) {
        qb.andWhere("order.deliveryStatus = :deliveryStatus", { deliveryStatus });
    }

    if (search) {
        qb.andWhere(
            "(CAST(order.orderNumber AS TEXT) ILIKE :search OR user.fullName ILIKE :search OR user.email ILIKE :search)",
            { search: `%${search}%` },
        );
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

export const getOrderDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const order = await OrderRepo.createQueryBuilder("order")
        .leftJoinAndSelect("order.user", "user")
        .leftJoinAndSelect("order.lineItems", "lineItems")
        .leftJoinAndSelect("order.deliveryHistory", "deliveryHistory")
        .select([
            "order.id",
            "order.orderNumber",
            "order.status",
            "order.deliveryStatus",
            "order.totalAmount",
            "order.subtotal",
            "order.deliveryCharge",
            "order.taxAmount",
            "order.deliveryAddress",
            "order.customerNote",
            "order.adminNote",
            "order.deliveredAt",
            "order.cancelledBy",
            "order.cancellationReason",
            "order.payment",
            "order.createdAt",
            "order.updatedAt",
            "user.id",
            "user.fullName",
            "user.email",
            "lineItems.id",
            "lineItems.productId",
            "lineItems.productSnapshot",
            "lineItems.quantity",
            "lineItems.unitPrice",
            "lineItems.totalPrice",
            "lineItems.createdAt",
            "deliveryHistory.id",
            "deliveryHistory.status",
            "deliveryHistory.deliveryPersonName",
            "deliveryHistory.deliveryPersonPhone",
            "deliveryHistory.location",
            "deliveryHistory.notes",
            "deliveryHistory.updatedBy",
            "deliveryHistory.createdAt",
        ])
        .where("order.id = :id", { id })
        .getOne();

    if (!order) return responseHandler.error(res, "Order not found", 404);

    return responseHandler.success(res, order, "Order retrieved");
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = req.body as any;

    await orderDeliveryHistorySchemas.updateStatus.validateAsync(payload);

    const order = await OrderRepo.findOne({
        where: { id },
        select: [
            "id",
            "status",
            "orderNumber",
            "totalAmount",
            "createdAt",
            "deliveryStatus",
            "payment",
        ],
        relations: ["payment", "user"],
    });
    if (!order) return responseHandler.error(res, "Order not found", 404);

    if (!isValidStatusTransition(order.status, payload.status)) {
        return responseHandler.error(
            res,
            `Invalid order status transition: ${order.status} cannot be changed to ${payload.status}. Please check the current order status and try again.`,
            400,
        );
    }

    // Check business rules from statuses.md
    const validationError = validateOrderStatusTransition(order, payload.status);
    if (validationError) {
        return responseHandler.error(res, validationError, 400);
    }

    order.status = payload.status;
    const savedOrder = await OrderRepo.save(order);

    const history = OrderDeliveryHistoryRepo.create({
        orderId: savedOrder.id,
        status: payload.status,
        deliveryPersonName: payload.deliveryPersonName,
        deliveryPersonPhone: payload.deliveryPersonPhone,
        location: payload.location,
        notes: payload.notes,
        updatedBy: req?.user?.userId,
    });

    await OrderDeliveryHistoryRepo.save(history);

    // Send notification for status change
    try {
        await sendOrderStatusNotification(
            order.user?.email || "",
            savedOrder.orderNumber,
            order.user?.fullName || "Customer",
            payload.status,
            savedOrder.totalAmount,
        );
    } catch (err) {
        console.error("Failed to send order status notification:", err);
    }

    return responseHandler.success(res, savedOrder, "Order status updated");
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = req.body as any;

    await orderDeliveryHistorySchemas.updatePayment.validateAsync(payload);

    const order = await OrderRepo.findOne({
        where: { id },
        select: ["id", "payment", "totalAmount", "orderNumber", "createdAt"],
    });
    if (!order) return responseHandler.error(res, "Order not found", 404);

    if (order.payment.status === PaymentStatus.PAID) {
        return responseHandler.error(res, "Order is already paid", 400);
    }

    order.payment.status = payload.status;
    order.payment.paidAt = new Date();
    order.payment.amountPaid = payload.amountPaid || order.totalAmount;
    order.payment.collectedBy = payload.collectedBy;

    const updated = await OrderRepo.save(order);

    return responseHandler.success(res, updated, "Payment status updated");
});

export const cancelOrderAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = req.body as any;

    const order = await OrderRepo.findOne({
        where: { id },
        select: ["id", "status", "orderNumber", "totalAmount", "createdAt"],
    });
    if (!order) return responseHandler.error(res, "Order not found", 404);

    if (order.status === OrderStatus.COMPLETED) {
        return responseHandler.error(res, "Cannot cancel completed order", 400);
    }

    if (order.status === OrderStatus.CANCELLED) {
        return responseHandler.error(res, "Order is already cancelled", 400);
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledBy = "admin";
    order.cancellationReason = payload.reason || "Cancelled by admin";

    const updated = await OrderRepo.save(order);

    return responseHandler.success(res, updated, "Order cancelled");
});

export const updateDeliveryStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = req.body as any;

    const order = await OrderRepo.findOne({
        where: { id },
        select: ["id", "orderNumber", "deliveryStatus", "createdAt", "totalAmount"],
        relations: ["user"],
    });
    if (!order) return responseHandler.error(res, "Order not found", 404);

    if (!order.deliveryStatus) {
        return responseHandler.error(
            res,
            "Order delivery status not initialized. Please confirm the order first.",
            400,
        );
    }

    const { newDeliveryStatus, deliveryPersonName, deliveryPersonPhone, location, notes } = payload;

    if (!isValidDeliveryStatusTransition(order.deliveryStatus, newDeliveryStatus)) {
        const friendlyMessage = getFriendlyDeliveryStatusError(order.deliveryStatus, newDeliveryStatus);
        return responseHandler.error(res, friendlyMessage, 400);
    }

    order.deliveryStatus = newDeliveryStatus;
    const savedOrder = await OrderRepo.save(order);

    const history = OrderDeliveryHistoryRepo.create({
        orderId: savedOrder.id,
        status: newDeliveryStatus,
        deliveryPersonName,
        deliveryPersonPhone,
        location,
        notes,
        updatedBy: req?.user?.userId,
    });

    await OrderDeliveryHistoryRepo.save(history);

    // Send notification for delivery status change
    try {
        await sendDeliveryStatusNotification(
            order.user?.email || "",
            savedOrder.orderNumber,
            order.user?.fullName || "Customer",
            newDeliveryStatus,
            savedOrder.totalAmount,
            deliveryPersonName,
            deliveryPersonPhone,
        );
    } catch (err) {
        console.error("Failed to send delivery status notification:", err);
    }

    return responseHandler.success(
        res,
        savedOrder,
        `Delivery status updated to ${newDeliveryStatus}`,
    );
});

function getFriendlyDeliveryStatusError(
    currentStatus: DeliveryStatus,
    attemptedStatus: DeliveryStatus,
): string {
    if (currentStatus === DeliveryStatus.DELIVERED) {
        return "Cannot update delivery status: This order has already been delivered.";
    }

    if (currentStatus === DeliveryStatus.DELIVERY_FAILED && attemptedStatus !== DeliveryStatus.OUT_FOR_DELIVERY) {
        return "Failed delivery can only be retried by changing status to 'Out for Delivery'.";
    }

    if (currentStatus === DeliveryStatus.AWAITING_PROCESSING && attemptedStatus !== DeliveryStatus.PROCESSING) {
        return "Order awaiting processing must be moved to 'Processing' status first.";
    }

    return `Cannot change delivery status from '${currentStatus}' to '${attemptedStatus}'. Please verify the current delivery status and try again.`;
}

export const getDeliveryHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const order = await OrderRepo.createQueryBuilder("order")
        .leftJoinAndSelect("order.deliveryHistory", "deliveryHistory")
        .select(["order.id", "order.orderNumber", "order.status"])
        .addSelect([
            "deliveryHistory.id",
            "deliveryHistory.status",
            "deliveryHistory.notes",
            "deliveryHistory.createdAt",
        ])
        .where("order.id = :id", { id })
        .orderBy("deliveryHistory.createdAt", "ASC")
        .getOne();

    if (!order) return responseHandler.error(res, "Order not found", 404);

    return responseHandler.success(
        res,
        {
            orderNumber: order.orderNumber,
            status: order.status,
            timeline: order.deliveryHistory,
        },
        "Delivery history retrieved",
    );
});

export default {
    listAllOrders,
    getOrderDetails,
    updateOrderStatus,
    updateDeliveryStatus,
    updatePaymentStatus,
    cancelOrderAdmin,
    getDeliveryHistory,
};
