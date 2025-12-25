import { createClient } from "redis";
import config from "@/config/env";
import { logger } from "@/utils/logger";

const redisUrl = process.env.REDIS_URL || `redis://${config.REDIS_HOST || '127.0.0.1'}:${config.REDIS_PORT || 6379}`;

const client = createClient({ url: redisUrl, socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 500) } });

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
    logger.info(`Connecting to Redis at ${redisUrl}...`);
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Redis connection timeout")), timeoutMs)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    isConnected = true;
    logger.info("Redis initialized successfully");
  } catch (err) {
    logger.error("Redis initialization failed", { error: (err as Error).message });
    isConnected = false;
    throw err;
  }
};

const setKey = async (key: string, value: string, ttlSeconds?: number) => {
  if (!isConnected) throw new Error("Redis not connected");
  if (ttlSeconds) {
    await client.set(key, value, { EX: ttlSeconds });
  } else {
    await client.set(key, value);
  }
};

const getKey = async (key: string) => {
  if (!isConnected) throw new Error("Redis not connected");
  return await client.get(key);
};

const delKey = async (key: string) => {
  if (!isConnected) throw new Error("Redis not connected");
  return await client.del(key);
};

export { client as redisClient, initRedis, setKey, getKey, delKey };
