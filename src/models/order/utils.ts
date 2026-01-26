import { OrderStatus, PaymentStatus } from "./entity";
import { DeliveryStatus } from "./entity";
import { AppDataSource } from "@/config/database";
import { Order } from "./entity";

export async function generateOrderNumber(): Promise<number> {
  const orderRepository = AppDataSource.getRepository(Order);
  const lastOrder = await orderRepository
    .createQueryBuilder("order")
    .select("MAX(order.orderNumber)", "maxOrderNumber")
    .getRawOne();

  const lastOrderNumber = lastOrder?.maxOrderNumber || 0;
  return lastOrderNumber + 1;
}


export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function isValidStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ORDER_STATUS_FLOW[from].includes(to);
}

/**
 * Validates OrderStatus transition with business rules from statuses.md
 * 
 * Prevents:
 * - ❌ COMPLETED without DELIVERED: Cannot complete order without delivery
 * - ❌ COMPLETED with PENDING payment: Cannot complete without payment settled
 * - ❌ CANCELLED after DELIVERED: Cannot cancel delivered orders
 * - ❌ CANCELLED while OUT_FOR_DELIVERY: Risky - courier en route
 */
export function validateOrderStatusTransition(
  order: Order,
  newStatus: OrderStatus,
): string | null {
  // Rule 1: COMPLETED requires DELIVERED
  if (newStatus === OrderStatus.COMPLETED) {
    if (order.deliveryStatus !== DeliveryStatus.DELIVERED) {
      return `Cannot complete order without delivery. Current delivery status: ${order.deliveryStatus}. Order must be delivered first.`;
    }
    // Rule 2: COMPLETED requires PAID
    if (order.payment?.status !== PaymentStatus.PAID) {
      return `Cannot complete order without payment. Payment status is ${order.payment?.status}. Please mark payment as paid first.`;
    }
  }

  // Rule 3: Cannot CANCEL delivered orders
  if (newStatus === OrderStatus.CANCELLED) {
    if (order.deliveryStatus === DeliveryStatus.DELIVERED) {
      return `Cannot cancel delivered orders. Order has already been delivered. Contact support if needed.`;
    }
    // Rule 4: Warn about OUT_FOR_DELIVERY cancellation
    if (order.deliveryStatus === DeliveryStatus.OUT_FOR_DELIVERY) {
      return `Cannot cancel order that is out for delivery. Courier is currently en route. Contact support for assistance.`;
    }
  }

  return null; // Valid transition
}

/**
 * Determines if a customer can cancel their order
 * Based on statuses.md requirements:
 * - PENDING ✅ Yes
 * - CONFIRMED ✅ Yes
 * - PROCESSING ⚠️ Cut-off point (possible fee)
 * - PACKING and beyond ❌ No
 */
export function canCustomerCancelOrder(
  orderStatus: OrderStatus,
): { canCancel: boolean; message?: string } {
  const cancellableByCustomer = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
  const cutoffStatus = OrderStatus.PROCESSING;

  if (cancellableByCustomer.includes(orderStatus)) {
    return { canCancel: true };
  }

  if (orderStatus === cutoffStatus) {
    return {
      canCancel: true,
      message:
        "Warning: Warehouse work is starting. Cancellation may incur a fee.",
    };
  }

  return {
    canCancel: false,
    message: `Cannot cancel orders in ${orderStatus} status. Please use our return/refund process instead.`,
  };
}

/**
 * Determines if admin can reverse a cancelled order
 * Used for correcting errors (controlled exception)
 */
export function canAdminReverseCancelledOrder(
  orderStatus: OrderStatus,
): boolean {
  // Can only reverse CANCELLED status back to CONFIRMED or PROCESSING
  if (orderStatus === OrderStatus.CANCELLED) {
    return true; // Admin can manually trigger reversal
  }
  return false;
}

/**
 * Delivery Status Flow - Defines valid transitions for delivery status
 * 
 * Forward Flow: AWAITING_PROCESSING → PROCESSING → PACKING → PACKED 
 *            → HANDED_TO_COURIER → OUT_FOR_DELIVERY → DELIVERED
 * 
 * Exception: DELIVERY_FAILED can occur after HANDED_TO_COURIER or OUT_FOR_DELIVERY
 *           and can retry back to OUT_FOR_DELIVERY
 * 
 * Irreversible: DELIVERED cannot be changed back to any previous status
 */
export const DELIVERY_STATUS_FLOW: Record<DeliveryStatus, DeliveryStatus[]> = {
  [DeliveryStatus.AWAITING_PROCESSING]: [
    DeliveryStatus.PROCESSING,
  ],
  [DeliveryStatus.PROCESSING]: [
    DeliveryStatus.PACKING,
  ],
  [DeliveryStatus.PACKING]: [
    DeliveryStatus.PACKED,
  ],
  [DeliveryStatus.PACKED]: [
    DeliveryStatus.HANDED_TO_COURIER,
  ],
  [DeliveryStatus.HANDED_TO_COURIER]: [
    DeliveryStatus.OUT_FOR_DELIVERY,
    DeliveryStatus.DELIVERY_FAILED, // Exception: Failed to hand over or courier cancelled
  ],
  [DeliveryStatus.OUT_FOR_DELIVERY]: [
    DeliveryStatus.DELIVERED,
    DeliveryStatus.DELIVERY_FAILED, // Exception: Delivery attempt failed
  ],
  [DeliveryStatus.DELIVERY_FAILED]: [
    DeliveryStatus.OUT_FOR_DELIVERY, // Retry delivery
  ],
  [DeliveryStatus.DELIVERED]: [], // Final state: No transitions allowed
};

export function isValidDeliveryStatusTransition(
  from: DeliveryStatus,
  to: DeliveryStatus,
): boolean {
  return DELIVERY_STATUS_FLOW[from].includes(to);
}
