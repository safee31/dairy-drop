// src/config/database.ts
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "@/utils/logger";

// Prisma Client Singleton
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Connect to database
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    if (!process.env.NODE_ENV?.includes("production")) {
      console.log("✓ Database connected");
    }
  } catch (error) {
    logger.error("Database connection failed", { error });
    throw error;
  }
};

// Disconnect from database
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info("Database disconnected successfully");
  } catch (error) {
    logger.error("Database disconnection failed", { error });
  }
};