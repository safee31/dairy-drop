import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { CartRepo } from "@/models/repositories";

export const listCarts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const [carts, total] = await CartRepo.findAndCount({
    relations: ["items", "user"],
    skip,
    take: Number(limit),
    order: { createdAt: "DESC" },
  });

  return responseHandler.success(res, { carts, pagination: { page: Number(page), limit: Number(limit), total } }, "Carts retrieved");
});

export const getCartById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cart = await CartRepo.findOne({ where: { id }, relations: ["items", "user"] });
  if (!cart) return responseHandler.error(res, "Cart not found", 404);

  return responseHandler.success(res, cart, "Cart retrieved");
});

export const deleteCart = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cart = await CartRepo.findOne({ where: { id } });
  if (!cart) return responseHandler.error(res, "Cart not found", 404);

  await CartRepo.remove(cart);

  return responseHandler.success(res, null, "Cart deleted");
});

export default { listCarts, getCartById, deleteCart };
