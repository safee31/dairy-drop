// src/config/database.ts
import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import config from "./env";
import { logger } from "@/utils/logger";

// Import entities
import { User } from "@/models/user";
import { Role } from "@/models/role";
import { Address } from "@/models/address";
import { Category } from "@/models/category/category.entity";
import { CategoryLevel1 } from "@/models/category/category-level1.entity";
import { CategoryLevel2 } from "@/models/category/category-level2.entity";
import { Product } from "@/models/product";
import { ProductImage } from "@/models/productImage";
import { Inventory } from "@/models/inventory";
import { InventoryHistory } from "@/models/inventoryHistory";
import { Cart } from "@/models/cart";
import { CartItem } from "@/models/cart";
import { Order, OrderLineItem, OrderDeliveryHistory } from "@/models/order";

// Redis cache configuration for TypeORM
const getCacheConfig = () => {
  if (config.REDIS_URL || (config.REDIS_HOST && config.REDIS_PORT)) {
    const redisUrl = config.REDIS_URL || `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`;
    return {
      type: "redis" as const,
      options: {
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries: number) => Math.min(retries * 50, 500),
        },
      },
      duration: 30000, // Cache for 30 seconds
    };
  }
  return false; // Disable caching if Redis not available
};

// Common configuration
const baseConfig: DataSourceOptions = {
  type: "postgres",
  url: config.DATABASE_URL,
  entities: [User, Role, Address, Category, CategoryLevel1, CategoryLevel2, Product, ProductImage, Inventory, InventoryHistory, Cart, CartItem, Order, OrderLineItem, OrderDeliveryHistory],
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
  // Performance optimizations
  cache: getCacheConfig(),
  // Logging: include queries and schema in development for visibility
  logging: config.IN_PROD ? ["error", "warn"] : ["error", "warn", "query", "schema"],
  logger: config.IN_PROD ? "file" : "advanced-console",
  maxQueryExecutionTime: 1000, // Log queries taking longer than 1 second
};

// Create DataSource for application (with synchronize based on environment)
export const AppDataSource = new DataSource({
  ...baseConfig,
  synchronize: config.IN_PROD ? false : true,
});

// Create DataSource for CLI (with synchronize always false)
export const CliDataSource = new DataSource({
  ...baseConfig,
  synchronize: false,
  logging: ["error", "warn", "query", "schema"],
});

// Database connection helpers
export const connectDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      if (!config.IN_PROD) {
        console.log("✓ Database connected");
      }
    }
  } catch (error) {
    logger.error("Database connection failed", { error });
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info("Database disconnected successfully");
    }
  } catch (error) {
    logger.error("Database disconnection failed", { error });
  }
};

export default AppDataSource;