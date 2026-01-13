import dotenv from "dotenv";

dotenv.config();

const config = {
  // Server Configuration
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  IN_PROD: process.env.NODE_ENV === "production",

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL,

  // Session Configuration (Redis-based)
  SESSION_EXPIRY: process.env.SESSION_EXPIRY ? parseInt(process.env.SESSION_EXPIRY) : 86400, // 24h
  STORAGE_TTL_SECONDS: process.env.STORAGE_TTL_SECONDS ? parseInt(process.env.STORAGE_TTL_SECONDS) : 86400, // 24h Redis storage lifetime
  REFRESH_EXPIRY: process.env.REFRESH_EXPIRY ? parseInt(process.env.REFRESH_EXPIRY) : 604800, // 7 days
  MAX_SESSIONS_PER_USER: process.env.MAX_SESSIONS_PER_USER ? parseInt(process.env.MAX_SESSIONS_PER_USER) : 5,
  LOGIN_ATTEMPT_WINDOW: process.env.LOGIN_ATTEMPT_WINDOW ? parseInt(process.env.LOGIN_ATTEMPT_WINDOW) : 900, // 15 min
  MAX_LOGIN_ATTEMPTS: process.env.MAX_LOGIN_ATTEMPTS ? parseInt(process.env.MAX_LOGIN_ATTEMPTS) : 5,
  COOKIE_MAX_AGE: process.env.COOKIE_MAX_AGE ? parseInt(process.env.COOKIE_MAX_AGE) : 86400000, // 24h in ms

  // JWT Configuration (deprecated - kept for backward compatibility)
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,

  // Cookie Configuration
  COOKIE_SECRET: process.env.COOKIE_SECRET,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_WINDOW_MS)
    : 15,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS
    ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)
    : 100,
  LOGIN_RATE_LIMIT_MAX_REQUESTS: process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS
    ? parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS)
    : 5,
  OTP_RATE_LIMIT_MAX_REQUESTS: process.env.OTP_RATE_LIMIT_MAX_REQUESTS
    ? parseInt(process.env.OTP_RATE_LIMIT_MAX_REQUESTS)
    : 3,
  PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS: process.env
    .PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS
    ? parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS)
    : 3,

  // Password Hashing
  BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS
    ? parseInt(process.env.BCRYPT_SALT_ROUNDS)
    : undefined,

  // Email Configuration
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT
    ? parseInt(process.env.EMAIL_PORT)
    : undefined,
  EMAIL_SECURE: process.env.EMAIL_SECURE === "true",
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,

  // CORS Configuration
  ORIGIN_URL: process.env.ORIGIN_URL,
  SERVER_URL: process.env.SERVER_URL,

  // AWS Configuration
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,

  // Redis Configuration (Security-hardened for e-commerce)
  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD, // Required: strong password for ACL
  REDIS_DB: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 11, // Isolated DB for Dairy Drop
  REDIS_MAX_RETRIES: process.env.REDIS_MAX_RETRIES ? parseInt(process.env.REDIS_MAX_RETRIES) : 3,
  REDIS_RETRY_DELAY: process.env.REDIS_RETRY_DELAY ? parseInt(process.env.REDIS_RETRY_DELAY) : 1000, // ms
  REDIS_CONNECTION_TIMEOUT: process.env.REDIS_CONNECTION_TIMEOUT ? parseInt(process.env.REDIS_CONNECTION_TIMEOUT) : 5000, // ms

  // OTP Configuration
  OTP_LENGTH: process.env.OTP_LENGTH ? parseInt(process.env.OTP_LENGTH) : 4,
  OTP_EXPIRY_MINUTES: process.env.OTP_EXPIRY_MINUTES
    ? parseInt(process.env.OTP_EXPIRY_MINUTES)
    : 60,
  RESET_TOKEN_EXPIRY_MINUTES: process.env.RESET_TOKEN_EXPIRY_MINUTES
    ? parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES)
    : 5,

  // Allow unverified users to login (useful for ecommerce flows where verification can be deferred)
  ALLOW_UNVERIFIED_LOGIN: process.env.ALLOW_UNVERIFIED_LOGIN === "true",

  // Security Headers
  SECURITY_HEADERS: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
  },
};

export default config;
