import crypto from "crypto";
import { setKey, getKey, delKey } from "@/utils/redis/redisClient";
import config from "@/config/env";

export interface SessionData {
  id: string;
  email: string;
  userId: string;
  ip: string;
  userAgent: string;
  createdAt: number;
  lastActive: number;
  expiresAt: number;
  isActive: boolean;
  revoked?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  session?: SessionData;
  email?: string;
  userId?: string;
}

const userBucketKey = (email: string) => `dd_login_session:${email.toLowerCase()}`;
const sessionIndexKey = (sessionId: string) => `dd_session_index:${sessionId}`;

const storageTTL = () => config.STORAGE_TTL_SECONDS;

const readUserBucket = async (email: string) => {
  const key = userBucketKey(email);
  const dataStr = await getKey(key);
  if (!dataStr) return { sessions: {}, refresh: {} } as any;
  try {
    return JSON.parse(dataStr);
  } catch (err) {
    return { sessions: {}, refresh: {} } as any;
  }
};

const writeUserBucket = async (email: string, bucket: any) => {
  const key = userBucketKey(email);
  await setKey(key, JSON.stringify(bucket), storageTTL());
};

const createSession = async (
  email: string,
  userId: string,
  ip: string,
  userAgent: string
): Promise<SessionData> => {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + config.SESSION_EXPIRY * 1000;

  const sessionData: SessionData = {
    id: sessionId,
    email: email.toLowerCase(),
    userId,
    ip,
    userAgent,
    createdAt: now,
    lastActive: now,
    expiresAt,
    isActive: true,
  };

  const bucket = await readUserBucket(email);
  bucket.sessions = bucket.sessions || {};
  bucket.sessions[sessionId] = sessionData;
  await writeUserBucket(email, bucket);

  // Ensure session index points to user's bucket for quick lookup
  await setKey(sessionIndexKey(sessionId), email.toLowerCase(), storageTTL());

  return sessionData;
};

const revokeSession = async (sessionId: string): Promise<void> => {
  const idx = await getKey(sessionIndexKey(sessionId));
  if (!idx) {
    const revokedKey = `revoked:${sessionId}`;
    await setKey(revokedKey, "1", 3600);
    return;
  }

  const email = idx as string;
  const bucket = await readUserBucket(email);
  if (bucket.sessions && bucket.sessions[sessionId]) {
    delete bucket.sessions[sessionId];
    await writeUserBucket(email, bucket);
  }

  await delKey(sessionIndexKey(sessionId));
};

const validateSession = async (sessionId: string, ip: string): Promise<ValidationResult> => {
  void ip;
  const idx = await getKey(sessionIndexKey(sessionId));
  if (!idx) return { isValid: false, reason: "Session not found" };

  const email = idx as string;
  const bucket = await readUserBucket(email);
  const raw = bucket.sessions && bucket.sessions[sessionId];
  if (!raw) return { isValid: false, reason: "Session not found in user bucket" };

  const session: SessionData = raw as SessionData;
  if (session.revoked) return { isValid: false, reason: "Session revoked" };
  if (Date.now() > session.expiresAt) return { isValid: false, reason: "Session expired" };

  session.lastActive = Date.now();
  session.expiresAt = Date.now() + config.SESSION_EXPIRY * 1000;
  bucket.sessions[sessionId] = session;
  await writeUserBucket(email, bucket);
  await setKey(sessionIndexKey(sessionId), email.toLowerCase(), storageTTL());

  return { isValid: true, session, email: session.email, userId: session.userId };
};

const login = async (
  email: string,
  userId: string,
  ip: string,
  userAgent: string
): Promise<{ sessionId: string; email: string; expiresAt: number }> => {
  const normalizedEmail = email.toLowerCase();
  const attemptKey = `login_attempts:${normalizedEmail}:${ip}`;
  const lockKey = `login_lock:${normalizedEmail}:${ip}`;

  // If account is temporarily locked due to repeated failures, deny immediately
  const isLocked = await getKey(lockKey);
  if (isLocked) {
    throw new Error("Too many login attempts. Account temporarily locked. Try again later.");
  }
  const attemptStr = await getKey(attemptKey);
  const attempts = attemptStr ? parseInt(attemptStr, 10) + 1 : 1;

  if (attempts === 1) {
    await setKey(attemptKey, "1", config.LOGIN_ATTEMPT_WINDOW);
  } else {
    await setKey(attemptKey, attempts.toString(), config.LOGIN_ATTEMPT_WINDOW);
  }

  if (attempts > config.MAX_LOGIN_ATTEMPTS) {
    // Set a temporary lock to enforce a backoff window
    const lockTtl = Math.max(config.LOGIN_ATTEMPT_WINDOW * 2, config.LOGIN_ATTEMPT_WINDOW);
    await setKey(lockKey, "1", lockTtl);
    throw new Error("Too many login attempts. Account temporarily locked. Try again later.");
  }

  const bucket = await readUserBucket(normalizedEmail);
  bucket.sessions = bucket.sessions || {};
  const existingSessionIds = Object.keys(bucket.sessions || {}).filter((sid) => !bucket.sessions[sid].revoked);

  if (existingSessionIds.length >= config.MAX_SESSIONS_PER_USER) {
    existingSessionIds.sort((a, b) => bucket.sessions[a].createdAt - bucket.sessions[b].createdAt);
    const oldestSessionId = existingSessionIds[0];
    await revokeSession(oldestSessionId);
  }

  // Create new session inside bucket
  const session = await createSession(normalizedEmail, userId, ip, userAgent);

  await delKey(attemptKey);

  return {
    sessionId: session.id,
    email: session.email,
    expiresAt: session.expiresAt,
  };
};

const refreshSession = async (
  sessionId: string,
  ip: string
): Promise<{ sessionId: string; expiresAt: number }> => {
  void ip;
  const idx = await getKey(sessionIndexKey(sessionId));

  if (!idx) {
    throw new Error("Session not found");
  }

  const email = idx as string;
  const bucket = await readUserBucket(email);

  const raw = bucket.sessions && bucket.sessions[sessionId];
  // session lookup (debug logging removed)

  if (!raw) throw new Error("Session not found in user bucket");
  const session: SessionData = raw as SessionData;
  if (session.revoked) throw new Error("Session has been revoked");

  const expiresAt = Date.now() + config.SESSION_EXPIRY * 1000;
  session.expiresAt = expiresAt;
  session.lastActive = Date.now();

  bucket.sessions[sessionId] = session;
  await writeUserBucket(email, bucket);
  await setKey(sessionIndexKey(sessionId), email.toLowerCase(), storageTTL());

  return { sessionId, expiresAt };
};

const logout = async (sessionId: string, email: string): Promise<boolean> => {
  const normalizedEmail = email.toLowerCase();
  
  const bucket = await readUserBucket(normalizedEmail);
  if (bucket.sessions && bucket.sessions[sessionId]) {
    delete bucket.sessions[sessionId];
    
    // Delete bucket if no sessions remain, else update it
    if (Object.keys(bucket.sessions).length === 0) {
      await delKey(userBucketKey(normalizedEmail));
    } else {
      await writeUserBucket(normalizedEmail, bucket);
    }
  }

  await delKey(sessionIndexKey(sessionId));
  
  // Clean up CSRF tokens associated with this session
  const csrfToken = await getKey(`csrf_session:${sessionId}`);
  if (csrfToken) {
    await delKey(`csrf:${csrfToken}`);
  }
  await delKey(`csrf_session:${sessionId}`);

  return true;
};

const logoutAll = async (email: string): Promise<{ count: number }> => {
  const normalizedEmail = email.toLowerCase();
  const bucket = await readUserBucket(normalizedEmail);
  const sessionIds = Object.keys(bucket.sessions || {});

  for (const sid of sessionIds) {
    await delKey(sessionIndexKey(sid));
  }

  await delKey(userBucketKey(normalizedEmail));

  return { count: sessionIds.length };
};

const isSessionRevoked = async (sessionId: string): Promise<boolean> => {
  const idx = await getKey(sessionIndexKey(sessionId));
  if (!idx) return true;
  const email = idx as string;
  const bucket = await readUserBucket(email);
  const s = bucket.sessions && bucket.sessions[sessionId];
  return !s || Boolean(s.revoked);
};

export const loginSessionService = {
  login,
  createSession,
  validateSession,
  refreshSession,
  logout,
  logoutAll,
  revokeSession,
  isSessionRevoked,
};

export default loginSessionService;
