import { OrderStatus } from "./entity";
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

export function formatOrderNumber(orderNumber: number): string {
  return `#${orderNumber.toString().padStart(6, "0")}`;
}

export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function isValidStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ORDER_STATUS_FLOW[from].includes(to);
}

export function calculateOrderTotals(
  subtotal: number,
  deliveryCharge: number = 0,
  taxRate: number = 0.05,
): {
  subtotal: number;
  taxAmount: number;
  deliveryCharge: number;
  totalAmount: number;
} {
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const totalAmount = subtotal + deliveryCharge + taxAmount;

  return {
    subtotal,
    taxAmount,
    deliveryCharge,
    totalAmount,
  };
}
