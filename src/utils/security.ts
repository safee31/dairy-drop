import crypto from "crypto";
import { setKey, getKey, } from "@/utils/redis/redisClient";
import { auditLogger } from "@/utils/logger";
import config from "@/config/env";

const csrfTokenKey = (token: string) => `csrf:${token}`;
const csrfSessionKey = (sessionId: string) => `csrf_session:${sessionId}`;
export const csrfService = {
  generate: async (sessionId: string, ttlSeconds: number = config.SESSION_EXPIRY): Promise<string> => {
    const existingToken = await getKey(csrfSessionKey(sessionId));
    if (existingToken) return existingToken as string;

    const token = crypto.randomBytes(32).toString("hex");
    await setKey(csrfTokenKey(token), sessionId, ttlSeconds);
    await setKey(csrfSessionKey(sessionId), token, ttlSeconds);
    return token;
  },

  validate: async (token: string, sessionId: string): Promise<boolean> => {
    if (!token) return false;
    const stored = await getKey(csrfTokenKey(token));
    if (!stored || stored !== sessionId) return false;
    // Don't delete token on validation - keep it alive for the session
    // Token will expire naturally with session TTL
    return true;
  },
};

/**
 * Session Security Service
 * Validates session metadata (IP, User-Agent) to detect hijacking
 */

export interface SessionMetadata {
  ip: string;
  userAgent: string;
}

// Calculate similarity between two strings (0-1)
const stringSimilarity = (a: string, b: string): number => {
  if (!a || !b) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

export const sessionSecurityService = {
  validateMetadata: (
    current: SessionMetadata,
    stored: SessionMetadata,
    options: { allowIpChange?: boolean; uaSimilarityThreshold?: number } = {},
  ): { isValid: boolean; reason?: string } => {
    const { allowIpChange = false, uaSimilarityThreshold = 0.7 } = options;

    if (!allowIpChange && current.ip !== stored.ip) {
      return { isValid: false, reason: `IP mismatch: ${stored.ip} → ${current.ip}` };
    }

    const uaSimilarity = stringSimilarity(current.userAgent, stored.userAgent);
    if (uaSimilarity < uaSimilarityThreshold) {
      return { isValid: false, reason: `User-Agent mismatch (similarity: ${(uaSimilarity * 100).toFixed(1)}%)` };
    }

    return { isValid: true };
  },
};

export const securityAuditService = {
  // General audit logging for all operations
  log: (
    operation: string,
    userId: string | undefined,
    metadata: Record<string, unknown> = {},
  ) => {
    auditLogger.info(`audit_${operation}`, {
      userId,
      operation,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  },
};

export default {
  csrfService,
  sessionSecurityService,
  securityAuditService,
};
