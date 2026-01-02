import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import config from "@/config/env";
import { customError, AuthErrors } from "@/utils/customError";
import { setKey, getKey, delKey } from "@/utils/redis/redisClient";
import { AppDataSource } from "@/config/database";
import { User } from "@/models/User";

const parseExpiryToSeconds = (val?: string): number | null => {
  if (!val) return null;
  const match = /^([0-9]+)([smhd])?$/.exec(val.trim());
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const unit = match[2] || "s";
  switch (unit) {
    case "d":
      return n * 24 * 60 * 60;
    case "h":
      return n * 60 * 60;
    case "m":
      return n * 60;
    case "s":
    default:
      return n;
  }
};

export interface JWTPayload {
  userId: string;
  email: string;
  roleId: string;
  jti?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const generateToken = (
  payload: JWTPayload,
  secret: string,
  expiresIn: string,
): string => {
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
    issuer: "tpa-api",
    audience: "tpa-users",
  });
};

export const generateTokenPair = async (
  payload: JWTPayload,
): Promise<TokenPair> => {
  if (
    !config.JWT_ACCESS_SECRET ||
    !config.JWT_REFRESH_SECRET ||
    !config.JWT_ACCESS_EXPIRES_IN ||
    !config.JWT_REFRESH_EXPIRES_IN
  ) {
    throw new Error("JWT configuration is incomplete");
  }

  const accessToken = generateToken(
    payload,
    config.JWT_ACCESS_SECRET,
    config.JWT_ACCESS_EXPIRES_IN,
  );

  const refreshToken = generateToken(
    payload,
    config.JWT_REFRESH_SECRET,
    config.JWT_REFRESH_EXPIRES_IN,
  );

  const tokenHash = await hashToken(refreshToken);
  const ttlSeconds = parseExpiryToSeconds(config.JWT_REFRESH_EXPIRES_IN) || 5 * 60;
  await setKey(`refresh:${tokenHash}`, payload.userId, ttlSeconds);

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string, secret: string): JWTPayload => {
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }

  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch {
    throw customError(AuthErrors.INVALID_TOKEN, 401);
  }
};

export const hashToken = async (token: string): Promise<string> => {
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const verifyAccessToken = async (token: string) => {
  if (!config.JWT_ACCESS_SECRET) {
    throw new Error("JWT access secret is not configured");
  }

  const decoded = verifyToken(token, config.JWT_ACCESS_SECRET) as JWTPayload;

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { id: decoded.userId },
    relations: ["role", "addresses"],
  });

  if (!user) {
    throw customError(AuthErrors.USER_NOT_FOUND, 401);
  }

  if (!user.isActive) {
    throw customError(AuthErrors.ACCOUNT_INACTIVE, 401);
  }

  if (!user.isVerified) {
    throw customError(AuthErrors.EMAIL_NOT_VERIFIED, 401);
  }

  const activeAddresses = user.addresses.filter((addr) => addr.isActive);
  const primaryAddresses = activeAddresses.filter((addr) => addr.isPrimary);

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      profileImage: user.profileImage,
      isVerified: user.isVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      role: user.role,
      addresses: primaryAddresses.length > 0 ? primaryAddresses : activeAddresses,
    },
  };
};

export const verifyRefreshToken = async (token: string) => {
  if (!config.JWT_REFRESH_SECRET) {
    throw new Error("JWT refresh secret is not configured");
  }

  const decoded = verifyToken(token, config.JWT_REFRESH_SECRET) as JWTPayload;

  const tokenHash = await hashToken(token);
  const stored = await getKey(`refresh:${tokenHash}`);
  if (!stored || stored !== decoded.userId) {
    throw customError(AuthErrors.INVALID_TOKEN, 401);
  }

  return decoded;
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  const tokenHash = await hashToken(token);
  await delKey(`refresh:${tokenHash}`);
};

export const setCookie = (
  res: Response,
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | "none" | "lax" | "strict" | undefined;
    maxAge?: number;
  } = {},
) => {
  const isProduction = config.IN_PROD;

  res.cookie(name, value, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: options.maxAge || 7 * 24 * 60 * 60 * 1000,
    path: "/",
    domain: config.COOKIE_DOMAIN,
    ...options,
  });
};

export const clearCookie = (res: Response, name: string) => {
  const isProduction = config.IN_PROD;
  const sameSiteValue = isProduction ? ("none" as const) : ("lax" as const);

  res.clearCookie(name, {
    httpOnly: true,
    secure: isProduction,
    sameSite: sameSiteValue,
    path: "/",
    domain: config.COOKIE_DOMAIN,
  });
};

export const extractToken = (req: Request): string | null => {
  const token = req.cookies?.tpa_session;
  return token || null;
};

export const cleanupExpiredTokens = async (): Promise<void> => {
  //
};

if (typeof global !== "undefined") {
  global.setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
}
