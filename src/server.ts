import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "./config/database";
import config from "./config/env";
import path from "path";
import { initRedis } from "./utils/redisClient";

// Import centralized routes
import routes from "./routes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.PORT || 8000;
const API_VERSION = process.env.API_VERSION || "v1";

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: config.SECURITY_HEADERS["Content-Security-Policy"]
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "https:"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
  }),
);

// CORS configuration
app.use(
  cors({
    origin: config.ORIGIN_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Middleware
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.COOKIE_SECRET));

// Security headers
Object.entries(config.SECURITY_HEADERS).forEach(([key, value]) => {
  app.use((req, res, next) => {
    res.setHeader(key, value);
    next();
  });
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: API_VERSION,
    environment: config.NODE_ENV,
  });
});
// API routes - using centralized routes
app.use(`/api/${API_VERSION}`, routes);

// Serve uploaded files from /uploads safely
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    index: false,
    dotfiles: "deny",
  }),
);

// 404 handler for unmatched routes
app.use(new RegExp(`^api/.*`), (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    version: API_VERSION,
  });
});

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Initialize Redis (with timeout and graceful degradation)
    logger.info("Initializing Redis...");
    await initRedis(5000).catch((err) => {
      logger.warn(`Redis unavailable: ${(err as Error).message}. Server will start but session management may not work.`);
    });

    // Test database connection with timeout
    logger.info("Connecting to database...");
    const dbConnectTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout after 10s - check if PostgreSQL is running")), 10000)
    );
    
    try {
      await Promise.race([prisma.$connect(), dbConnectTimeout]);
    } catch (dbErr) {
      logger.error("Database connection failed", { 
        error: (dbErr as Error).message,
        hint: "Ensure PostgreSQL is running and DATABASE_URL in .env is correct"
      });
      throw dbErr;
    }
    
    logger.info("Database connected successfully");

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 API Version: ${API_VERSION}`);
      logger.info(`🌍 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 Health Check: http://localhost:${PORT}/health`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api/${API_VERSION}`);
    });
  } catch (error) {
    logger.error("Failed to start server", { error: (error as Error).message, stack: (error as Error).stack });
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
