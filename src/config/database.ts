// src/config/database.ts
import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import config from "./env";
import { logger } from "@/utils/logger";

// Import entities
import { User } from "@/models/User";
import { Role } from "@/models/Role";
import { Address } from "@/models/Address";

// Common configuration
const baseConfig: DataSourceOptions = {
  type: "postgres",
  url: config.DATABASE_URL,
  entities: [User, Role, Address],
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
};

// Create DataSource for application (with synchronize based on environment)
export const AppDataSource = new DataSource({
  ...baseConfig,
  synchronize: config.IN_PROD ? false : true,
  logging: config.IN_PROD ? false : true,
});

// Create DataSource for CLI (with synchronize always false)
export const CliDataSource = new DataSource({
  ...baseConfig,
  synchronize: false,
  logging: true,
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