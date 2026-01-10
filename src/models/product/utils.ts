const productUtils = {
  validateDiscount(discount: { type: "percentage" | "fixed"; value: number }, price: number): void {
    if (discount.type === "percentage" && discount.value > 100) {
      throw new Error("Percentage discount cannot exceed 100%");
    }
    if (discount.type === "fixed" && discount.value >= price) {
      throw new Error("Fixed discount cannot be equal to or greater than price");
    }
  },

  calculateSalePrice(price: number, discount?: { type: "percentage" | "fixed"; value: number } | null): number {
    if (!discount) return price;
    
    if (discount.type === "percentage") {
      return Math.round((price * (100 - discount.value)) / 100 * 100) / 100;
    }
    return Math.round((price - discount.value) * 100) / 100;
  },
};

export { productUtils };
