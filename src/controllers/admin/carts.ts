import asyncHandler from "@/utils/asyncHandler";
import { responseHandler } from "@/middleware/responseHandler";
import { CartRepo } from "@/models/repositories";

const listCarts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    search = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const queryBuilder = CartRepo.createQueryBuilder("cart")
    .leftJoinAndSelect("cart.items", "items")
    .leftJoinAndSelect("cart.user", "user");

  if (search) {
    queryBuilder.andWhere(
      "(user.fullName ILIKE :search OR user.email ILIKE :search)",
      { search: `%${search}%` },
    );
  }

  const total = await queryBuilder.getCount();

  const carts = await queryBuilder
    .orderBy(`cart.${String(sortBy)}`, String(sortOrder).toUpperCase() as "ASC" | "DESC")
    .skip(skip)
    .take(Number(limit))
    .getMany();

  return responseHandler.success(
    res,
    {
      carts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
    "Carts retrieved",
  );
});

const getCartById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cart = await CartRepo.findOne({ where: { id }, relations: ["items", "user"] });
  if (!cart) return responseHandler.error(res, "Cart not found", 404);

  return responseHandler.success(res, cart, "Cart retrieved");
});

const deleteCart = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cart = await CartRepo.findOne({ where: { id } });
  if (!cart) return responseHandler.error(res, "Cart not found", 404);

  await CartRepo.remove(cart);

  return responseHandler.success(res, null, "Cart deleted");
});

export default { listCarts, getCartById, deleteCart };
