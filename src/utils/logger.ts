import winston from "winston";
import path from "path";
import config from "@/config/env";
import { AsyncLocalStorage } from "async_hooks";

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

const getRequestId = (): string => {
  return requestContext.getStore()?.requestId || "";
};

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

// Create main logger - minimal logging for scalability
export const logger = winston.createLogger({
  level: config.IN_PROD ? "warn" : "info",
  format: config.IN_PROD ? prodFormat : devFormat,
  transports: [
    // Errors only - keep logs minimal and scalable
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error", // Only errors to file
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    // Warnings to combined log (for monitoring)
    new winston.transports.File({
      filename: path.join("logs", "combined.log"),
      level: "warn", // warn and above
      maxsize: 10485760, // 10MB
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

const baseAuditLogger = winston.createLogger({
  level: "info",
  format: prodFormat,
  transports: [
    new winston.transports.File({
      filename: path.join("logs", "audit.log"),
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

export const auditLogger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    const requestId = getRequestId();
    baseAuditLogger.info(message, requestId ? { requestId, ...meta } : meta);
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    const requestId = getRequestId();
    baseAuditLogger.warn(message, requestId ? { requestId, ...meta } : meta);
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    const requestId = getRequestId();
    baseAuditLogger.error(message, requestId ? { requestId, ...meta } : meta);
  },
};

export const logWithContext = (level: "info" | "warn" | "error" | "debug", message: string, meta?: Record<string, unknown>) => {
  const requestId = getRequestId();
  logger[level](message, requestId ? { requestId, ...meta } : meta);
};
