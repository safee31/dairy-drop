import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { securityAuditService } from "@/utils/security";
import { transactionUtils } from "@/config/database";
import {
  OrderRepo,
  RefundRepo,
  RefundHistoryRepo,
} from "@/models/repositories";
import { DeliveryStatus } from "@/models/order/entity";
import { RefundStatus } from "@/models/refund";
import refundSchemas from "@/models/refund/schema";
import refundUtils from "@/models/refund/utils";
import { saveImage } from "@/utils/image";

const REFUND_EVIDENCE_FOLDER = "refunds";
const MAX_EVIDENCE_FILES = 3;

const checkEligibility = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { orderId } = req.params;

  const order = await OrderRepo.findOne({
    where: { id: orderId, userId },
    relations: ["lineItems"],
    select: { id: true, status: true, deliveryStatus: true, deliveredAt: true, lineItems: { id: true, quantity: true } },
  });

  if (!order) return responseHandler.error(res, "Order not found", 404);

  const existingRefunds = await RefundRepo.find({
    where: { orderId, customerId: userId },
    select: ["id", "status", "refundedItems"],
  });

  const orderLineItems = order.lineItems.map((li) => ({ id: li.id, quantity: li.quantity }));

  const eligibility = refundUtils.canCustomerRequestRefund(
    order.status,
    order.deliveryStatus,
    order.deliveredAt,
    existingRefunds,
    orderLineItems,
  );

  return responseHandler.success(res, eligibility, "Eligibility checked");
});

const createRefund = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const payload = await refundSchemas.create.validateAsync(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  const order = await OrderRepo.findOne({
    where: { id: payload.orderId, userId },
    relations: ["lineItems"],
  });

  if (!order) return responseHandler.error(res, "Order not found", 404);

  const orderLineItems = order.lineItems.map((li) => ({ id: li.id, quantity: li.quantity }));

  // Eligibility check
  const existingRefunds = await RefundRepo.find({
    where: { orderId: payload.orderId, customerId: userId },
    select: ["id", "status", "refundedItems"],
  });

  const eligibility = refundUtils.canCustomerRequestRefund(
    order.status,
    order.deliveryStatus,
    order.deliveredAt,
    existingRefunds,
    orderLineItems,
  );

  if (!eligibility.eligible) {
    return responseHandler.error(res, eligibility.message!, 400);
  }

  // Reason validation
  if (order.deliveryStatus) {
    const reasonCheck = refundUtils.isValidRefundReason(
      order.deliveryStatus as DeliveryStatus,
      payload.reason,
    );
    if (!reasonCheck.valid) {
      return responseHandler.error(res, reasonCheck.message!, 400);
    }
  }

  // Ensure requested quantities don't exceed remaining refundable quantity
  const alreadyRefundedQty = eligibility.alreadyRefundedQuantities || {};
  if (payload.refundedItems) {
    const lineItemMap = new Map(order.lineItems.map((li) => [li.id, li]));
    const overCapacity = payload.refundedItems.filter((ri: any) => {
      const lineItem = lineItemMap.get(ri.orderLineItemId);
      if (!lineItem) return true;
      const alreadyUsed = alreadyRefundedQty[ri.orderLineItemId] || 0;
      return alreadyUsed + ri.quantity > lineItem.quantity;
    });
    if (overCapacity.length > 0) {
      return responseHandler.error(
        res,
        `${overCapacity.length} item(s) exceed the available refundable quantity.`,
        400,
      );
    }
  }

  // Build refundedItems with price snapshots + calculate total
  let refundAmount = Number(order.totalAmount);
  let refundedItems = null;

  if (payload.refundedItems && payload.refundedItems.length > 0) {
    const lineItemMap = new Map(order.lineItems.map((li) => [li.id, li]));

    refundedItems = payload.refundedItems.map((ri: any) => {
      const lineItem = lineItemMap.get(ri.orderLineItemId);
      if (!lineItem) return null;
      const unitPrice = Number(lineItem.unitPrice);
      return {
        orderLineItemId: ri.orderLineItemId,
        quantity: ri.quantity,
        unitPrice,
        totalPrice: ri.quantity * unitPrice,
      };
    }).filter(Boolean);

    if (refundedItems.length === 0) {
      return responseHandler.error(res, "No valid line items selected", 400);
    }

    refundAmount = refundedItems.reduce((sum: number, ri: any) => sum + ri.totalPrice, 0);
  }

  const refund = await transactionUtils.executeInTransaction(async (manager) => {
    const newRefund = manager.create(RefundRepo.target, {
      orderId: payload.orderId,
      customerId: userId,
      status: RefundStatus.PENDING,
      reason: payload.reason,
      customerNote: payload.customerNote || null,
      amount: refundAmount,
      currency: payload.currency || "PKR",
      refundedItems,
      refundPayment: {
        method: payload.preferredRefundMethod || "original_method",
        status: "awaiting",
      },
    });

    const savedRefund = await manager.save(newRefund);

    await manager.save(
      manager.create(RefundHistoryRepo.target, {
        refundId: savedRefund.id,
        fromStatus: RefundStatus.PENDING,
        toStatus: RefundStatus.PENDING,
        notes: "Refund requested by customer",
        changedBy: "customer",
      }),
    );

    return savedRefund;
  });

  securityAuditService.log("refund:create", userId, {
    refundId: refund.id,
    orderId: payload.orderId,
    amount: refundAmount,
    reason: payload.reason,
  });

  return responseHandler.success(res, refund, "Refund requested successfully", 201);
});

const uploadEvidence = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    return responseHandler.error(res, "No evidence images provided", 400);
  }

  const refund = await RefundRepo.findOne({
    where: { id, customerId: userId },
    select: ["id", "status", "evidenceUrls"],
  });

  if (!refund) return responseHandler.error(res, "Refund not found", 404);

  if (refund.status !== RefundStatus.PENDING) {
    return responseHandler.error(res, "Evidence can only be uploaded for pending refunds", 400);
  }

  const files = req.files as Express.Multer.File[];
  const existingCount = refund.evidenceUrls?.length || 0;

  if (existingCount + files.length > MAX_EVIDENCE_FILES) {
    return responseHandler.error(
      res,
      `Maximum ${MAX_EVIDENCE_FILES} evidence photos allowed. You already have ${existingCount}.`,
      400,
    );
  }

  const savedPaths = await Promise.all(
    files.map((file) => saveImage(file, REFUND_EVIDENCE_FOLDER)),
  );

  refund.evidenceUrls = [...(refund.evidenceUrls || []), ...savedPaths];
  await RefundRepo.save(refund);

  return responseHandler.success(res, { evidenceUrls: refund.evidenceUrls }, "Evidence uploaded successfully", 201);
});

const listRefunds = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { page = 1, limit = 10, status } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const qb = RefundRepo.createQueryBuilder("refund")
    .leftJoinAndSelect("refund.order", "order")
    .select([
      "refund.id",
      "refund.orderId",
      "refund.status",
      "refund.reason",
      "refund.amount",
      "refund.currency",
      "refund.createdAt",
      "order.id",
      "order.orderNumber",
    ])
    .where("refund.customerId = :userId", { userId })
    .skip(skip)
    .take(Number(limit));

  if (status) {
    qb.andWhere("refund.status = :status", { status });
  }

  const [refunds, total] = await qb
    .orderBy("refund.createdAt", "DESC")
    .getManyAndCount();

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

const getRefund = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  const refund = await RefundRepo.createQueryBuilder("refund")
    .leftJoinAndSelect("refund.order", "order")
    .leftJoinAndSelect("order.lineItems", "lineItems")
    .leftJoinAndSelect("refund.history", "history")
    .where("refund.id = :id AND refund.customerId = :userId", { id, userId })
    .orderBy("history.createdAt", "DESC")
    .getOne();

  if (!refund) return responseHandler.error(res, "Refund not found", 404);

  return responseHandler.success(res, refund, "Refund retrieved");
});

export default {
  checkEligibility,
  createRefund,
  uploadEvidence,
  listRefunds,
  getRefund,
};
