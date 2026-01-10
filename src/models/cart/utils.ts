import { CartItem } from "./cartitem.entity";

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateCartTotals(items: CartItem[]): {
  subtotal: number;
  deliveryCharge: number;
  taxAmount: number;
  totalAmount: number;
  totalItems: number;
  totalQuantity: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalItems = items.length;

  const deliveryCharge = subtotal > 500 ? 0 : 50;
  const taxAmount = Math.round(subtotal * 5) / 100;

  return {
    subtotal,
    deliveryCharge,
    taxAmount,
    totalAmount: subtotal + deliveryCharge + taxAmount,
    totalItems,
    totalQuantity,
  };
}

export function calculateFinalPrice(
  basePrice: number,
  discount?: { type: "percentage" | "fixed"; value: number },
): number {
  if (!discount) return basePrice;

  if (discount.type === "percentage") {
    return Math.round((basePrice - (basePrice * discount.value) / 100) * 100) / 100;
  } else {
    return Math.max(0, Math.round((basePrice - discount.value) * 100) / 100);
  }
}
