import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import {
    OrderRepo,
    OrderDeliveryHistoryRepo,
} from "@/models/repositories";
import { OrderStatus, PaymentStatus } from "@/models/order";
import orderDeliveryHistorySchemas from "@/models/order/orderdeliveryhistory.schema";
import {
    formatOrderNumber,
    isValidStatusTransition,
} from "@/models/order/utils";

export const listAllOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, status, userId } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);

    const qb = OrderRepo.createQueryBuilder("order")
        .leftJoinAndSelect("order.lineItems", "lineItems")
        .leftJoinAndSelect("order.deliveryHistory", "deliveryHistory")
        .skip(skip)
        .take(Number(limit));

    if (status) {
        qb.andWhere("order.status = :status", { status });
    }

    if (userId) {
        qb.andWhere("order.userId = :userId", { userId });
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

export const getOrderDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const order = await OrderRepo.findOne({
        where: { id },
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

export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = req.body as any;

    await orderDeliveryHistorySchemas.updateStatus.validateAsync(payload);

    const order = await OrderRepo.findOne({ where: { id } });
    if (!order) return responseHandler.error(res, "Order not found", 404);

    if (!isValidStatusTransition(order.status, payload.status)) {
        return responseHandler.error(
            res,
            `Cannot transition from ${order.status} to ${payload.status}`,
            400,
        );
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
        updatedBy: (req.user as any).id,
    });

    await OrderDeliveryHistoryRepo.save(history);

    return responseHandler.success(
        res,
        {
            ...savedOrder,
            orderNumber: formatOrderNumber(savedOrder.orderNumber),
        },
        "Order status updated",
    );
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = req.body as any;

    await orderDeliveryHistorySchemas.updatePayment.validateAsync(payload);

    const order = await OrderRepo.findOne({ where: { id } });
    if (!order) return responseHandler.error(res, "Order not found", 404);

    if (order.payment.status === PaymentStatus.PAID) {
        return responseHandler.error(res, "Order is already paid", 400);
    }

    order.payment.status = payload.status;
    order.payment.paidAt = new Date();
    order.payment.amountPaid = payload.amountPaid || order.totalAmount;
    order.payment.collectedBy = payload.collectedBy;

    const updated = await OrderRepo.save(order);

    return responseHandler.success(
        res,
        {
            ...updated,
            orderNumber: formatOrderNumber(updated.orderNumber),
        },
        "Payment status updated",
    );
});

export const cancelOrderAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = req.body as any;

    const order = await OrderRepo.findOne({ where: { id } });
    if (!order) return responseHandler.error(res, "Order not found", 404);

    if (order.status === OrderStatus.DELIVERED) {
        return responseHandler.error(res, "Cannot cancel delivered order", 400);
    }

    if (order.status === OrderStatus.CANCELLED) {
        return responseHandler.error(res, "Order is already cancelled", 400);
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledBy = "admin";
    order.cancellationReason = payload.reason || "Cancelled by admin";

    const updated = await OrderRepo.save(order);

    const history = OrderDeliveryHistoryRepo.create({
        orderId: updated.id,
        status: OrderStatus.CANCELLED,
        notes: `Admin cancellation: ${payload.reason || "No reason provided"}`,
        updatedBy: (req.user as any).id,
    });

    await OrderDeliveryHistoryRepo.save(history);

    return responseHandler.success(
        res,
        {
            ...updated,
            orderNumber: formatOrderNumber(updated.orderNumber),
        },
        "Order cancelled",
    );
});

export const getDeliveryHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const order = await OrderRepo.findOne({
        where: { id },
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
            timeline,
        },
        "Delivery history retrieved",
    );
});

export default {
    listAllOrders,
    getOrderDetails,
    updateOrderStatus,
    updatePaymentStatus,
    cancelOrderAdmin,
    getDeliveryHistory,
};
