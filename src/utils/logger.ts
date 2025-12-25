import winston from "winston";
import path from "path";
import config from "@/config/env";

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint(),
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.IN_PROD ? "info" : "debug",
  format: logFormat,
  defaultMeta: { service: "dairy-drop-api" },
  transports: [
    // Write errors to error.log
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join("logs", "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for non-production
if (!config.IN_PROD) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
          }`;
        }),
      ),
    }),
  );
}

// Create audit logger for compliance
export const auditLogger = winston.createLogger({
  level: "info",
  format: logFormat,
  defaultMeta: { service: "dairy-drop-audit" },
  transports: [
    new winston.transports.File({
      filename: path.join("logs", "audit.log"),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});
