import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import config from "@/config/env";
import { customError, AuthErrors } from "@/utils/customError";
import { setKey, getKey, delKey } from "@/utils/redis/redisClient";
import { UserRepo, AddressRepo } from "@/models/repositories";

export const parseExpiryToSeconds = (val?: string): number => {
  if (!val) return 300; // Default 5 minutes
  const match = /^([0-9]+)([smhd])?$/.exec(val.trim());
  if (!match) return 300; // Invalid format, use default
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
    issuer: "dd-api",
    audience: "dd-users",
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

  // Store refresh token in Redis with TTL matching token expiry
  const tokenHash = await hashToken(refreshToken);
  const refreshTtlSeconds = parseExpiryToSeconds(config.JWT_REFRESH_EXPIRES_IN);
  await setKey(`refresh:${tokenHash}`, payload.userId, refreshTtlSeconds);

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

  const user = await UserRepo.findOne({
    where: { id: decoded.userId },
    relations: ["role"],
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

  // Build response with user data
  const userData: any = {
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
  };

  // For customers (role type 2), query primary active address from database
  if (user.role?.type === 2) {
    const primaryAddress = await AddressRepo.findOne({
      where: {
        userId: user.id,
        isPrimary: true,
        isActive: true,
      },
    });

    userData.address = primaryAddress || null;
  }

  return {
    user: userData,
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

  // Calculate default maxAge based on token type
  let defaultMaxAgeMs: number;
  if (name === "dd_session") {
    // Access token: use JWT_ACCESS_EXPIRES_IN
    defaultMaxAgeMs = parseExpiryToSeconds(config.JWT_ACCESS_EXPIRES_IN) * 1000;
  } else if (name === "dd_refresh") {
    // Refresh token: use JWT_REFRESH_EXPIRES_IN
    defaultMaxAgeMs = parseExpiryToSeconds(config.JWT_REFRESH_EXPIRES_IN) * 1000;
  } else {
    // Default fallback: 7 days
    defaultMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
  }

  res.cookie(name, value, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: options.maxAge !== undefined ? options.maxAge : defaultMaxAgeMs,
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
  const token = req.cookies?.dd_session;
  return token || null;
};
