import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import {
  OrderRepo,
  RefundRepo,
  RefundHistoryRepo,
} from "@/models/repositories";
import { OrderRefundStatus } from "@/models/order";
import { RefundStatus } from "@/models/refund";
import refundUtils from "@/models/refund/utils";

const listAllRefunds = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const qb = RefundRepo.createQueryBuilder("refund")
    .leftJoinAndSelect("refund.order", "order")
    .leftJoinAndSelect("refund.customer", "customer")
    .select([
      "refund.id",
      "refund.orderId",
      "refund.status",
      "refund.reason",
      "refund.amount",
      "refund.currency",
      "refund.refundPayment",
      "refund.createdAt",
      "order.id",
      "order.orderNumber",
      "customer.id",
      "customer.fullName",
      "customer.email",
    ]);

  if (status) {
    qb.andWhere("refund.status = :status", { status });
  }

  const total = await qb.getCount();

  const refunds = await qb
    .orderBy(`refund.${String(sortBy)}`, String(sortOrder).toUpperCase() as "ASC" | "DESC")
    .skip(skip)
    .take(Number(limit))
    .getMany();

  return responseHandler.success(
    res,
    {
      refunds,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
    "Refunds retrieved",
  );
});

const getRefundDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const refund = await RefundRepo.createQueryBuilder("refund")
    .leftJoinAndSelect("refund.order", "order")
    .leftJoinAndSelect("order.lineItems", "lineItems")
    .leftJoinAndSelect("refund.customer", "customer")
    .leftJoinAndSelect("refund.processedBy", "processedBy")
    .leftJoinAndSelect("refund.history", "history")
    .select([
      "refund.id",
      "refund.orderId",
      "refund.customerId",
      "refund.processedById",
      "refund.status",
      "refund.reason",
      "refund.customerNote",
      "refund.adminNote",
      "refund.amount",
      "refund.currency",
      "refund.refundPayment",
      "refund.refundedItems",
      "refund.evidenceUrls",
      "refund.createdAt",
      "refund.updatedAt",
      "refund.processedAt",
      "order.id",
      "order.orderNumber",
      "order.status",
      "order.deliveryStatus",
      "order.totalAmount",
      "lineItems.id",
      "lineItems.productId",
      "lineItems.productSnapshot",
      "lineItems.quantity",
      "lineItems.unitPrice",
      "lineItems.totalPrice",
      "customer.id",
      "customer.fullName",
      "customer.email",
      "processedBy.id",
      "processedBy.fullName",
      "history.id",
      "history.fromStatus",
      "history.toStatus",
      "history.notes",
      "history.changedBy",
      "history.createdAt",
    ])
    .where("refund.id = :id", { id })
    .orderBy("history.createdAt", "DESC")
    .getOne();

  if (!refund) return responseHandler.error(res, "Refund not found", 404);

  return responseHandler.success(res, refund, "Refund retrieved");
});

const updateRefundStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.userId;
  const payload = req.body as any;

  const refund = await RefundRepo.findOne({
    where: { id },
    relations: ["order", "order.lineItems"],
  });

  if (!refund) return responseHandler.error(res, "Refund not found", 404);

  if (!refundUtils.isValidRefundStatusTransition(refund.status, payload.status)) {
    return responseHandler.error(
      res,
      `Invalid status transition: ${refund.status} cannot be changed to ${payload.status}.`,
      400,
    );
  }

  const previousStatus = refund.status;
  refund.status = payload.status;
  refund.processedById = adminId || null;

  if (payload.adminNote) {
    refund.adminNote = payload.adminNote;
  }

  if (
    payload.status === RefundStatus.APPROVED ||
    payload.status === RefundStatus.REJECTED ||
    payload.status === RefundStatus.COMPLETED
  ) {
    refund.processedAt = new Date();
  }

  const savedRefund = await RefundRepo.save(refund);

  // Sync order.refundStatus based on all approved/completed refunds
  if (
    payload.status === RefundStatus.APPROVED ||
    payload.status === RefundStatus.REJECTED
  ) {
    const approvedRefunds = await RefundRepo.find({
      where: [
        { orderId: refund.orderId, status: RefundStatus.APPROVED },
        { orderId: refund.orderId, status: RefundStatus.COMPLETED },
      ],
      select: ["id", "status", "refundedItems"],
    });

    const orderLineItems = refund.order.lineItems.map((li) => ({ id: li.id, quantity: li.quantity }));
    const newRefundStatus = refundUtils.computeOrderRefundStatus(approvedRefunds, orderLineItems);
    await OrderRepo.update(refund.orderId, { refundStatus: newRefundStatus as OrderRefundStatus });
  }

  await RefundHistoryRepo.save(
    RefundHistoryRepo.create({
      refundId: savedRefund.id,
      fromStatus: previousStatus,
      toStatus: payload.status,
      notes: payload.adminNote || null,
      changedBy: "admin",
    }),
  );

  return responseHandler.success(res, savedRefund, "Refund status updated");
});

const updateRefundPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = req.body as any;

  const refund = await RefundRepo.findOne({
    where: { id },
  });

  if (!refund) return responseHandler.error(res, "Refund not found", 404);

  if (refund.status !== RefundStatus.APPROVED && refund.status !== RefundStatus.COMPLETED) {
    return responseHandler.error(
      res,
      "Refund payment can only be updated for approved or completed refunds.",
      400,
    );
  }

  const previousPaymentStatus = refund.refundPayment.status;

  refund.refundPayment = {
    ...refund.refundPayment,
    ...payload,
    ...(payload.status === "completed" ? { paidAt: new Date() } : {}),
  };

  const savedRefund = await RefundRepo.save(refund);

  await RefundHistoryRepo.save(
    RefundHistoryRepo.create({
      refundId: savedRefund.id,
      fromStatus: refund.status,
      toStatus: refund.status,
      notes: `Payment status: ${previousPaymentStatus} → ${payload.status}`,
      changedBy: "admin",
    }),
  );

  return responseHandler.success(res, savedRefund, "Refund payment updated");
});

export default {
  listAllRefunds,
  getRefundDetails,
  updateRefundStatus,
  updateRefundPayment,
};
