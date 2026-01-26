import { AppDataSource } from "@/config/database";
import { Repository, EntityTarget, ObjectLiteral } from "typeorm";
import { User } from "./user/entity";
import { Role } from "./role/entity";
import { Address } from "./address/entity";
import { Category } from "./category/category.entity";
import { CategoryLevel1 } from "./category/category-level1.entity";
import { CategoryLevel2 } from "./category/category-level2.entity";
import { Product } from "./product/entity";
import { ProductImage } from "./productImage/entity";
import { Inventory } from "./inventory/entity";
import { InventoryHistory } from "./inventoryHistory/entity";
import { Cart } from "./cart";
import { CartItem } from "./cart";
import { Order } from "./order";
import { OrderLineItem } from "./order";
import { OrderDeliveryHistory } from "./order";
import { HeroSection } from "./heroSection/entity";

const repositoryCache = new Map<EntityTarget<ObjectLiteral>, Repository<ObjectLiteral>>();

function getRepository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
  if (!AppDataSource.isInitialized) {
    throw new Error("Database not initialized. Call connectDatabase() first.");
  }
  
  const cached = repositoryCache.get(entity as EntityTarget<ObjectLiteral>);
  if (cached) {
    return cached as Repository<T>;
  }
  
  const repo = AppDataSource.getRepository(entity);
  repositoryCache.set(entity as EntityTarget<ObjectLiteral>, repo as Repository<ObjectLiteral>);
  return repo;
}

function createRepoProxy<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
  return new Proxy({} as Repository<T>, {
    get(_target, prop) {
      return getRepository(entity)[prop as keyof Repository<T>];
    },
  });
}

const repos = {
  User: createRepoProxy(User),
  Role: createRepoProxy(Role),
  Address: createRepoProxy(Address),
  Category: createRepoProxy(Category),
  CategoryLevel1: createRepoProxy(CategoryLevel1),
  CategoryLevel2: createRepoProxy(CategoryLevel2),
  Product: createRepoProxy(Product),
  ProductImage: createRepoProxy(ProductImage),
  Inventory: createRepoProxy(Inventory),
  InventoryHistory: createRepoProxy(InventoryHistory),
  Cart: createRepoProxy(Cart),
  CartItem: createRepoProxy(CartItem),
  Order: createRepoProxy(Order),
  OrderLineItem: createRepoProxy(OrderLineItem),
  OrderDeliveryHistory: createRepoProxy(OrderDeliveryHistory),
  HeroSection: createRepoProxy(HeroSection),
};

export const UserRepo = repos.User;
export const RoleRepo = repos.Role;
export const AddressRepo = repos.Address;
export const CategoryRepo = repos.Category;
export const CategoryLevel1Repo = repos.CategoryLevel1;
export const CategoryLevel2Repo = repos.CategoryLevel2;
export const ProductRepo = repos.Product;
export const ProductImageRepo = repos.ProductImage;
export const InventoryRepo = repos.Inventory;
export const InventoryHistoryRepo = repos.InventoryHistory;
export const CartRepo = repos.Cart;
export const CartItemRepo = repos.CartItem;
export const OrderRepo = repos.Order;
export const OrderLineItemRepo = repos.OrderLineItem;
export const OrderDeliveryHistoryRepo = repos.OrderDeliveryHistory;
export const HeroSectionRepo = repos.HeroSection;

export const getRepo = <T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> => {
  return getRepository(entity);
};
