import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

// Create Prisma client with logging
export const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "error",
    },
    {
      emit: "event",
      level: "info",
    },
    {
      emit: "event",
      level: "warn",
    },
  ],
});

// Handle Prisma events
prisma.$on(
  "query",
  (e: { query: string; params: unknown; duration: number }) => {
    if (process.env.NODE_ENV === "development") {
      logger.debug("Prisma Query", {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    }
  },
);

prisma.$on("error", (e: { target: string; message: string }) => {
  logger.error("Prisma Error", {
    target: e.target,
    message: e.message,
  });
});

prisma.$on("info", (e: { target: string; message: string }) => {
  logger.info("Prisma Info", {
    target: e.target,
    message: e.message,
  });
});

prisma.$on("warn", (e: { target: string; message: string }) => {
  logger.warn("Prisma Warning", {
    target: e.target,
    message: e.message,
  });
});

// Test database connection
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Database connection failed", { error });
    throw error;
  }
};

// Graceful disconnect
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info("Database disconnected successfully");
  } catch (error) {
    logger.error("Database disconnection failed", { error });
  }
};
