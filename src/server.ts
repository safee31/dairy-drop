import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { requestIdMiddleware } from "./middleware/requestId";
import { httpLoggerMiddleware } from "./middleware/httpLogger";
import { prisma, connectDatabase } from "./config/database";
import config from "./config/env";
import path from "path";
import { initRedis } from "./utils/redis/redisClient";
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
  })
);

// Middleware
app.use(compression());
app.use(requestIdMiddleware); // Generate/track request IDs first
app.use(httpLoggerMiddleware); // Log HTTP requests
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

// API routes
app.use(`/api/${API_VERSION}`, routes);

// Serve uploaded files
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    index: false,
    dotfiles: "deny",
  })
);

// 404 handler for unmatched routes
app.use(new RegExp(`^api/.*`), (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Initialize Redis (optional - graceful degradation)
    if (!config.IN_PROD) console.log("Initializing Redis...");
    try {
      await initRedis(5000);
      if (!config.IN_PROD) console.log("✓ Redis connected");
    } catch (err) {
      logger.warn("Redis unavailable, continuing without it:", (err as Error).message);
    }

    // Connect to database
    if (!config.IN_PROD) console.log("Connecting to database...");
    await connectDatabase();

    app.listen(PORT, () => {
      if (!config.IN_PROD) {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 API Version: ${API_VERSION}`);
        console.log(`🌍 Environment: ${config.NODE_ENV}`);
        console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
        console.log(`📚 API Info: http://localhost:${PORT}/api/${API_VERSION}`);
      }
    })
  } catch (error) {
    logger.error("Failed to start server", { error: (error as Error).message });
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  if (!config.IN_PROD) console.log("Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();