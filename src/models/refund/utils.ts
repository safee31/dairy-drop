import { OrderStatus, DeliveryStatus } from "@/models/order/entity";
import { RefundStatus, RefundReason } from "./entity";
import type { RefundItem } from "./entity";

const REFUND_WINDOW_DAYS = 3;

const REFUND_STATUS_FLOW: Record<RefundStatus, RefundStatus[]> = {
  [RefundStatus.PENDING]: [RefundStatus.APPROVED, RefundStatus.REJECTED],
  [RefundStatus.APPROVED]: [RefundStatus.COMPLETED, RefundStatus.FAILED],
  [RefundStatus.REJECTED]: [],
  [RefundStatus.COMPLETED]: [],
  [RefundStatus.FAILED]: [RefundStatus.APPROVED],
};

const REASONS_BY_DELIVERY_STATUS: Record<string, RefundReason[]> = {
  [DeliveryStatus.DELIVERED]: [
    RefundReason.SPOILED,
    RefundReason.DAMAGED,
    RefundReason.WRONG_ITEM,
    RefundReason.MISSING_ITEMS,
  ],
  [DeliveryStatus.DELIVERY_FAILED]: [
    RefundReason.NOT_DELIVERED,
  ],
};

interface ExistingRefundInfo {
  status: RefundStatus;
  refundedItems?: RefundItem[] | null;
}

interface RefundEligibility {
  eligible: boolean;
  message?: string;
  allowedReasons?: RefundReason[];
  alreadyRefundedQuantities?: Record<string, number>;
}

function isWithinRefundWindow(
  deliveredAt: Date,
): { withinWindow: boolean; message?: string } {
  const now = new Date();
  const deliveryDate = new Date(deliveredAt);
  const windowEnd = new Date(deliveryDate);
  windowEnd.setDate(windowEnd.getDate() + REFUND_WINDOW_DAYS);

  if (now > windowEnd) {
    const formattedDate = windowEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return {
      withinWindow: false,
      message: `Refund window closed on ${formattedDate}. Dairy products must be reported within ${REFUND_WINDOW_DAYS} days of delivery.`,
    };
  }

  return { withinWindow: true };
}

const refundUtils = {
  REFUND_STATUS_FLOW,

  REASONS_BY_DELIVERY_STATUS,

  isValidRefundStatusTransition(from: RefundStatus, to: RefundStatus): boolean {
    return REFUND_STATUS_FLOW[from].includes(to);
  },

  canCustomerRequestRefund(
    orderStatus: OrderStatus,
    deliveryStatus: DeliveryStatus | null | undefined,
    deliveredAt: Date | null | undefined,
    existingRefunds: ExistingRefundInfo[],
    orderLineItems: { id: string; quantity: number }[],
  ): RefundEligibility {
    if (orderStatus === OrderStatus.CANCELLED) {
      return {
        eligible: false,
        message: "Cannot request refund for a cancelled order.",
      };
    }

    if (
      orderStatus === OrderStatus.PENDING ||
      orderStatus === OrderStatus.CONFIRMED ||
      orderStatus === OrderStatus.PROCESSING
    ) {
      return {
        eligible: false,
        message: "Order has not been delivered yet. Please cancel the order instead.",
      };
    }

    if (orderStatus !== OrderStatus.COMPLETED) {
      return {
        eligible: false,
        message: `Refund is not available for orders in "${orderStatus}" status.`,
      };
    }

    const activeStatuses = [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.COMPLETED];
    const activeRefunds = existingRefunds.filter((r) => activeStatuses.includes(r.status));

    const refundedQuantities: Record<string, number> = {};

    if (activeRefunds.length > 0) {
      const hasFullRefund = activeRefunds.some((r) => !r.refundedItems || r.refundedItems.length === 0);
      if (hasFullRefund) {
        return {
          eligible: false,
          message: "A full refund already exists for this order.",
        };
      }

      activeRefunds.forEach((r) => {
        (r.refundedItems || []).forEach((ri) => {
          refundedQuantities[ri.orderLineItemId] = (refundedQuantities[ri.orderLineItemId] || 0) + ri.quantity;
        });
      });

      const allFullyRefunded = orderLineItems.every(
        (li) => (refundedQuantities[li.id] || 0) >= li.quantity,
      );
      if (allFullyRefunded) {
        return {
          eligible: false,
          message: "All items in this order have already been fully refunded.",
        };
      }
    }

    if (deliveryStatus === DeliveryStatus.DELIVERY_FAILED) {
      return {
        eligible: true,
        allowedReasons: REASONS_BY_DELIVERY_STATUS[DeliveryStatus.DELIVERY_FAILED],
        alreadyRefundedQuantities: refundedQuantities,
      };
    }

    if (deliveryStatus === DeliveryStatus.DELIVERED) {
      if (!deliveredAt) {
        return {
          eligible: false,
          message: "Delivery date is missing. Please contact support.",
        };
      }

      const windowResult = isWithinRefundWindow(deliveredAt);
      if (!windowResult.withinWindow) {
        return {
          eligible: false,
          message: windowResult.message,
        };
      }

      return {
        eligible: true,
        allowedReasons: REASONS_BY_DELIVERY_STATUS[DeliveryStatus.DELIVERED],
        alreadyRefundedQuantities: refundedQuantities,
      };
    }

    return {
      eligible: false,
      message: "Refund is only available after delivery. Please wait for the delivery outcome.",
    };
  },

  computeOrderRefundStatus(
    approvedRefunds: ExistingRefundInfo[],
    orderLineItems: { id: string; quantity: number }[],
  ): "none" | "partial" | "full" {
    if (approvedRefunds.length === 0) return "none";

    const hasFullRefund = approvedRefunds.some(
      (r) => !r.refundedItems || r.refundedItems.length === 0,
    );
    if (hasFullRefund) return "full";

    const refundedQuantities: Record<string, number> = {};
    approvedRefunds.forEach((r) => {
      (r.refundedItems || []).forEach((ri) => {
        refundedQuantities[ri.orderLineItemId] = (refundedQuantities[ri.orderLineItemId] || 0) + ri.quantity;
      });
    });

    const allFullyRefunded = orderLineItems.every(
      (li) => (refundedQuantities[li.id] || 0) >= li.quantity,
    );
    if (allFullyRefunded) return "full";

    return "partial";
  },

  isValidRefundReason(
    deliveryStatus: DeliveryStatus,
    reason: RefundReason,
  ): { valid: boolean; message?: string } {
    const allowed = REASONS_BY_DELIVERY_STATUS[deliveryStatus];
    if (!allowed) {
      return {
        valid: false,
        message: `Refund reasons are not available for delivery status "${deliveryStatus}".`,
      };
    }

    if (!allowed.includes(reason)) {
      return {
        valid: false,
        message: `Reason "${reason}" is not valid for delivery status "${deliveryStatus}". Allowed: ${allowed.join(", ")}.`,
      };
    }

    return { valid: true };
  },
};

export default refundUtils;
