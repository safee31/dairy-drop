import { CartItem } from "./cartitem.entity";

/**
 * Cart total calculations utility
 * IMPORTANT: Must match frontend cartCalculations in dairy-drop-client/src/utils/cartCalculations.js
 * Any changes here must be synchronized with the frontend!
 */
export function calculateCartTotals(
  items: CartItem[],
  deliveryCharge: number = 0,
  taxAmount: number = 0
): {
  subtotal: number;
  deliveryCharge: number;
  taxAmount: number;
  totalAmount: number;
  totalItems: number;
  totalQuantity: number;
} {
  // Filter out deleted/unselected products from calculation
  const activeItems = items.filter((item) => !item.product?.isDeleted && item.isSelected !== false);

  // Use totalPrice (unitPrice * quantity) which already includes sale price/discounts
  const subtotal = activeItems.reduce((sum, item) => {
    return sum + Number(item.totalPrice || 0);
  }, 0);

  const totalQuantity = activeItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalItems = activeItems.length;

  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const totalAmount = Math.round((roundedSubtotal + deliveryCharge + taxAmount) * 100) / 100;

  return {
    subtotal: roundedSubtotal,
    deliveryCharge,
    taxAmount,
    totalAmount,
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

