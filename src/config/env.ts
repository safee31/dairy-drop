import dotenv from "dotenv";

dotenv.config();

const config = {
  // Server Configuration
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  IN_PROD: process.env.NODE_ENV === "production",

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL,

  // JWT Configuration
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

  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined,

  // OTP Configuration
  OTP_LENGTH: process.env.OTP_LENGTH ? parseInt(process.env.OTP_LENGTH) : 4,
  OTP_EXPIRY_MINUTES: process.env.OTP_EXPIRY_MINUTES
    ? parseInt(process.env.OTP_EXPIRY_MINUTES)
    : 60,
  RESET_TOKEN_EXPIRY_MINUTES: process.env.RESET_TOKEN_EXPIRY_MINUTES
    ? parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES)
    : 5,

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
