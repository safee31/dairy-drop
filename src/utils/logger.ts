import winston from "winston";
import path from "path";
import config from "@/config/env";
import { AsyncLocalStorage } from "async_hooks";

// AsyncLocalStorage for request-scoped context (no extra package needed)
export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

// Get current requestId or empty string
const getRequestId = (): string => {
  return requestContext.getStore()?.requestId || "";
};

// Production format: clean JSON with only necessary fields
const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: false }), // Don't log stack traces in prod
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const log: Record<string, unknown> = {
      timestamp,
      level,
      message,
      service: "dairy-drop-api",
    };
    if (requestId) log.requestId = requestId;
    if (Object.keys(meta).length && meta.service !== "dairy-drop-api") {
      log.context = meta;
    }
    return JSON.stringify(log);
  }),
);

// Development format: colored console output, easy to read
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const rid = requestId ? ` [${requestId}]` : "";
    const metaStr =
      Object.keys(meta).length && meta.service !== "dairy-drop-api"
        ? ` ${JSON.stringify(meta)}`
        : "";
    return `${timestamp} [${level}]${rid}: ${message}${metaStr}`;
  }),
);

// Create main logger
export const logger = winston.createLogger({
  level: config.IN_PROD ? "warn" : "debug", // Only warn/error in prod, debug in dev
  format: config.IN_PROD ? prodFormat : devFormat,
  transports: [
    // Errors and warnings only (no request-level logs to reduce file size)
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Console in development only
if (!config.IN_PROD) {
  logger.add(
    new winston.transports.Console({
      format: devFormat,
    }),
  );
}

// Audit logger for compliance (login, register, auth events)
export const auditLogger = winston.createLogger({
  level: "info",
  format: prodFormat,
  transports: [
    new winston.transports.File({
      filename: path.join("logs", "audit.log"),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Helper: log with requestId automatically injected
export const logWithContext = (level: "info" | "warn" | "error" | "debug", message: string, meta?: Record<string, unknown>) => {
  const requestId = getRequestId();
  logger[level](message, requestId ? { requestId, ...meta } : meta);
};
