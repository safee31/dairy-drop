import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { CartRepo, CartItemRepo, ProductRepo } from "@/models/repositories";
import { cartItemSchemas, cartSchemas } from "@/models/cart";
import { calculateCartTotals } from "@/models/cart/utils";

export const getCart = asyncHandler(async (req, res) => {
  const userId = (req.user as any).id as string;

  const cart = await CartRepo.findOne({
    where: { userId },
    relations: ["items", "items.product"],
  });

  if (!cart) return responseHandler.success(res, { items: [] }, "Cart is empty");

  return responseHandler.success(res, cart, "Cart retrieved");
});

export const addToCart = asyncHandler(async (req, res) => {
  const userId = (req.user as any).id as string;
  const payload = req.body as any;

  await cartItemSchemas.addToCart.validateAsync(payload);

  let cart = await CartRepo.findOne({ where: { userId }, relations: ["items"] });
  if (!cart) {
    cart = CartRepo.create({ userId, items: [] });
    // persist new cart to ensure cart.id exists for CartItem relations
    await CartRepo.save(cart);
  }

  const product = await ProductRepo.findOne({ where: { id: payload.productId, isActive: true } });
  if (!product) return responseHandler.error(res, "Product not found", 404);

  const unitPrice = Number(product.salePrice);

  const existing = cart.items.find((i: any) => i.productId === payload.productId);

  if (existing) {
    existing.quantity += Number(payload.quantity);
    existing.totalPrice = Number(existing.unitPrice) * existing.quantity;
    await CartItemRepo.save(existing);
  } else {
    const newItem = CartItemRepo.create({
      cartId: cart.id,
      productId: payload.productId,
      quantity: Number(payload.quantity),
      unitPrice,
      totalPrice: Number((unitPrice * Number(payload.quantity)).toFixed(2)),
    });
    const saved = await CartItemRepo.save(newItem);
    cart.items.push(saved);
  }

  const totals = calculateCartTotals(cart.items);
  cart.subtotal = totals.subtotal;
  cart.deliveryCharge = totals.deliveryCharge;
  cart.taxAmount = totals.taxAmount;
  cart.totalAmount = totals.totalAmount;
  cart.totalItems = totals.totalItems;
  cart.totalQuantity = totals.totalQuantity;

  await CartRepo.save(cart);

  return responseHandler.success(res, cart, "Item added to cart");
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const userId = (req.user as any).id as string;
  const { itemId } = req.params;
  const payload = req.body as any;

  await cartItemSchemas.updateCartItem.validateAsync(payload);

  const cart = await CartRepo.findOne({ where: { userId }, relations: ["items"] });
  if (!cart) return responseHandler.error(res, "Cart not found", 404);

  const item = await CartItemRepo.findOne({ where: { id: itemId, cartId: cart.id } });
  if (!item) return responseHandler.error(res, "Cart item not found", 404);

  if (payload.quantity <= 0) {
    await CartItemRepo.remove(item);
  } else {
    item.quantity = Number(payload.quantity);
    item.totalPrice = Number((Number(item.unitPrice) * item.quantity).toFixed(2));
    await CartItemRepo.save(item);
  }

  const updatedCart = await CartRepo.findOne({ where: { userId }, relations: ["items"] });
  if (!updatedCart) return responseHandler.error(res, "Cart not found", 404);

  const totals = calculateCartTotals(updatedCart.items);
  updatedCart.subtotal = totals.subtotal;
  updatedCart.deliveryCharge = totals.deliveryCharge;
  updatedCart.taxAmount = totals.taxAmount;
  updatedCart.totalAmount = totals.totalAmount;
  updatedCart.totalItems = totals.totalItems;
  updatedCart.totalQuantity = totals.totalQuantity;
  await CartRepo.save(updatedCart);

  return responseHandler.success(res, updatedCart, "Cart updated");
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const userId = (req.user as any).id as string;
  const { itemId } = req.params;

  const cart = await CartRepo.findOne({ where: { userId }, relations: ["items"] });
  if (!cart) return responseHandler.error(res, "Cart not found", 404);

  const item = await CartItemRepo.findOne({ where: { id: itemId, cartId: cart.id } });
  if (!item) return responseHandler.error(res, "Cart item not found", 404);

  await CartItemRepo.remove(item);

  const updatedCart = await CartRepo.findOne({ where: { userId }, relations: ["items"] });
  if (!updatedCart) return responseHandler.error(res, "Cart not found", 404);

  const totals = calculateCartTotals(updatedCart.items);
  updatedCart.subtotal = totals.subtotal;
  updatedCart.deliveryCharge = totals.deliveryCharge;
  updatedCart.taxAmount = totals.taxAmount;
  updatedCart.totalAmount = totals.totalAmount;
  updatedCart.totalItems = totals.totalItems;
  updatedCart.totalQuantity = totals.totalQuantity;
  await CartRepo.save(updatedCart);

  return responseHandler.success(res, updatedCart, "Item removed from cart");
});

export const selectDeliveryAddress = asyncHandler(async (req, res) => {
  const userId = (req.user as any).id as string;
  const payload = req.body as any;

  await cartSchemas.selectAddress.validateAsync(payload);

  const cart = await CartRepo.findOne({ where: { userId } });
  if (!cart) return responseHandler.error(res, "Cart not found", 404);

  cart.deliveryAddress = payload.addressId ? { id: payload.addressId } as any : payload.address;
  await CartRepo.save(cart);

  return responseHandler.success(res, cart, "Delivery address selected");
});

export default {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  selectDeliveryAddress,
};
