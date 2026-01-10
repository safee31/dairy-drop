import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const authUtils = {
  hashPassword: async (
    password: string,
    saltRounds: number = 12,
  ): Promise<string> => {
    return await bcrypt.hash(password, saltRounds);
  },

  comparePassword: async (
    password: string,
    hashedPassword: string,
  ): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
  },

  generateJWT: (
    user: { id: string; email: string; roleId: string },
    secret: string,
    expiresIn: string = "15m",
  ): string => {
    const payload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      jti: Math.random().toString(36).substring(2, 15),
    };

    return jwt.sign(payload, secret, {
      expiresIn,
      issuer: "training-platform-api",
      audience: "training-platform-users",
    } as jwt.SignOptions);
  },

  verifyJWT: (token: string, secret: string): Record<string, unknown> => {
    try {
      return jwt.verify(token, secret) as Record<string, unknown>;
    } catch {
      throw new Error("Invalid or expired token");
    }
  },

  generateSecureToken: (length: number = 32): string => {
    return crypto.randomBytes(length).toString("hex");
  },

  hashToken: (token: string): string => {
    return crypto.createHash("sha256").update(token).digest("hex");
  },
};

export { authUtils };