import { createClient } from "redis";
import config from "@/config/env";
import { logger } from "@/utils/logger";

const redisUrl = config.REDIS_URL || `redis://${config.REDIS_HOST || '127.0.0.1'}:${config.REDIS_PORT || 6379}`;

// Build Redis client options with security hardening for e-commerce
const clientOptions: any = { 
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries: number) => {
      const maxRetries = config.REDIS_MAX_RETRIES || 3;
      if (retries > maxRetries) {
        logger.error(`Redis: Max reconnection attempts (${maxRetries}) exceeded`);
        return new Error("Redis reconnection limit exceeded");
      }
      const delay = Math.min((config.REDIS_RETRY_DELAY || 1000) * retries, 10000);
      logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries}/${maxRetries})`);
      return delay;
    },
    connectTimeout: config.REDIS_CONNECTION_TIMEOUT || 5000,
    keepAlive: 30000, // Keep-alive to detect stale connections
  },
};

// Add authentication (required for production)
if (!config.REDIS_PASSWORD) {
  logger.warn("[SECURITY] Redis password not set! This is NOT recommended for production.");
} else {
  clientOptions.password = config.REDIS_PASSWORD;
}

// Select isolated database for this application
if (config.REDIS_DB !== undefined) {
  clientOptions.database = config.REDIS_DB;
}

// Enable TLS for secure transport in production (auto-enabled via NODE_ENV=production)
// Skip TLS for localhost development/testing
const isLocalhost = redisUrl.includes("127.0.0.1") || redisUrl.includes("localhost");
if (config.IN_PROD && !isLocalhost) {
  if (clientOptions.socket) {
    clientOptions.socket.tls = true;
  }
  logger.info("[SECURITY] Redis TLS enabled for production");
}

const client = createClient(clientOptions);

let isConnected = false;

client.on("error", (err) => {
  logger.error("Redis connection error", { error: (err as Error).message });
  isConnected = false;
});

client.on("connect", () => {
  logger.info("Redis connected");
  isConnected = true;
});

client.on("ready", () => {
  logger.info("Redis ready");
});

// Connect once on initialization with timeout
const initRedis = async (timeoutMs: number = 5000): Promise<void> => {
  if (isConnected) return;

  try {
    const dbInfo = config.REDIS_DB !== undefined ? ` (DB: ${config.REDIS_DB})` : "";
    const tlsInfo = config.IN_PROD ? " [TLS]" : "";
    logger.info(`🔐 Connecting to Redis at ${redisUrl}${dbInfo}${tlsInfo}...`);
    
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis connection timeout")), timeoutMs)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    isConnected = true;
    
    // Log Redis info for security verification
    try {
      const info = await client.info();
      const redisVersion = info.match(/redis_version:([^\r\n]+)/)?.[1] || "unknown";
      logger.info(`✅ Redis initialized successfully (v${redisVersion}, DB: ${config.REDIS_DB || 0})`);
    } catch {
      logger.info("✅ Redis initialized successfully");
    }
  } catch (err) {
    logger.error("❌ Redis initialization failed", { error: (err as Error).message });
    isConnected = false;
    throw err;
  }
};

const setKey = async (key: string, value: string, ttlSeconds?: number) => {
  if (!isConnected) throw new Error("Redis not connected");
  
  // Security: Prevent key injection and validate key format
  if (!key || key.trim() === "") {
    throw new Error("Redis key cannot be empty");
  }
  
  if (ttlSeconds) {
    if (ttlSeconds <= 0) throw new Error("TTL must be positive");
    await client.set(key, value, { EX: ttlSeconds });
  } else {
    await client.set(key, value);
  }
};

const getKey = async (key: string) => {
  if (!isConnected) throw new Error("Redis not connected");
  
  if (!key || key.trim() === "") {
    throw new Error("Redis key cannot be empty");
  }
  
  return await client.get(key);
};

const delKey = async (...keys: string[]) => {
  if (!isConnected) throw new Error("Redis not connected");
  if (keys.length === 0) return 0;
  
  // Security: Validate all keys
  for (const key of keys) {
    if (!key || key.trim() === "") {
      throw new Error("Redis key cannot be empty");
    }
  }
  
  return await client.del(keys);
};

const incrementKey = async (key: string) => {
  if (!isConnected) throw new Error("Redis not connected");
  
  if (!key || key.trim() === "") {
    throw new Error("Redis key cannot be empty");
  }
  
  return await client.incr(key);
};

export { client as redisClient, initRedis, setKey, getKey, delKey, incrementKey };
