import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import config from "./env";
import { logger } from "@/utils/logger";

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
import { Order } from "@/models/order";
import OrderLineItem from "@/models/order/orderlineitem.entity";
import OrderDeliveryHistory from "@/models/order/orderdeliveryhistory.entity";
import { HeroSection } from "@/models/heroSection";
import { ProductReview } from "@/models/productReview";
import ReviewResponse from "@/models/productReview/reviewresponse.entity";
import { Refund } from "@/models/refund";
import RefundHistory from "@/models/refund/refundhistory.entity";
import { OrderSubscriber } from "@/models/order/order.subscriber";

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
      duration: 30000,
    };
  }
  return false;
};

const baseConfig: DataSourceOptions = {
  type: "postgres",
  url: config.DATABASE_URL,
  entities: [User, Role, Address, Category, CategoryLevel1, CategoryLevel2, Product, ProductImage, Inventory, InventoryHistory, Cart, CartItem, Order, OrderLineItem, OrderDeliveryHistory, HeroSection, ProductReview, ReviewResponse, Refund, RefundHistory],
  migrations: ["src/migrations/*.ts"],
  subscribers: [OrderSubscriber],
  cache: getCacheConfig(),
  logging: config.IN_PROD ? ["error", "warn"] : ["error", "warn", "query", "schema"],
  logger: config.IN_PROD ? "file" : "advanced-console",
  maxQueryExecutionTime: 1000,
};

export const AppDataSource = new DataSource({
  ...baseConfig,
  synchronize: config.IN_PROD ? false : true,
});

export const CliDataSource = new DataSource({
  ...baseConfig,
  synchronize: false,
  logging: ["error", "warn", "query", "schema"],
});

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

export const transactionUtils = {
  /**
   * Execute a callback function within a database transaction
   * Automatically handles connection, transaction lifecycle, and error handling
   * 
   * @param callback - Async function that receives queryRunner and manager
   * @returns Result of the callback function
   * 
   * @example
   * const order = await transactionUtils.executeInTransaction(async (manager) => {
   *   const cart = await manager.findOne(Cart, { where: { userId } });
   *   const order = manager.create(Order, { userId });
   *   await manager.save(order);
   *   return order;
   * });
   */
  executeInTransaction: async <T>(
    callback: (manager: any) => Promise<T>
  ): Promise<T> => {
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      const result = await callback(queryRunner.manager);
      
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error("Transaction failed and rolled back", { error });
      throw error;
    } finally {
      await queryRunner.release();
    }
  },

  /**
   * Execute a callback with full queryRunner access for advanced transaction scenarios
   * Provides queryRunner object for direct control
   * 
   * @param callback - Async function that receives full queryRunner object
   * @returns Result of the callback function
   * 
   * @example
   * const result = await transactionUtils.withQueryRunner(async (queryRunner) => {
   *   const manager = queryRunner.manager;
   *   const cart = await manager.findOne(Cart, { where: { userId } });
   *   // ... perform operations
   *   return { success: true };
   * });
   */
  withQueryRunner: async <T>(
    callback: (queryRunner: any) => Promise<T>
  ): Promise<T> => {
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      const result = await callback(queryRunner);
      
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error("Transaction failed and rolled back", { error });
      throw error;
    } finally {
      await queryRunner.release();
    }
  },

  /**
   * Get a new query runner for manual transaction management
   * Use this only when you need manual control over transaction lifecycle
   * Remember to call release() after use
   * 
   * @returns QueryRunner instance ready for use
   * 
   * @example
   * const queryRunner = await transactionUtils.getQueryRunner();
   * try {
   *   await queryRunner.startTransaction();
   *   // ... perform operations
   *   await queryRunner.commitTransaction();
   * } catch (error) {
   *   await queryRunner.rollbackTransaction();
   * } finally {
   *   await queryRunner.release();
   * }
   */
  getQueryRunner: async () => {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    return queryRunner;
  },

  /**
   * Release a query runner safely
   * 
   * @param queryRunner - QueryRunner instance to release
   */
  releaseQueryRunner: async (queryRunner: any) => {
    try {
      if (queryRunner?.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
    } catch (error) {
      logger.error("Error during transaction cleanup", { error });
    } finally {
      await queryRunner?.release();
    }
  },
};

export default AppDataSource;