import { Request, Response, NextFunction } from "express";
import { clearCookie } from "@/utils/jwt";
import { csrfService, sessionSecurityService, SessionMetadata, securityAuditService } from "@/utils/security";
import { responseHandler } from "@/middleware/responseHandler";
import { AuthErrors } from "@/utils/customError";

// Attach CSRF token (reuse per session) in `x-csrf-token` header
export const csrfTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      return next();
    }

    // Get or generate CSRF token (reuses existing token for the session)
    // Token expires with session, preventing stale token issues
    const csrfToken = await csrfService.generate(sessionId);
    res.locals.csrfToken = csrfToken;
    
    // Send CSRF token in response header for frontend to capture
    res.setHeader("x-csrf-token", csrfToken);

    next();
  } catch (error) {
    // Non-critical, continue without CSRF token
    next();
  }
};

// Validate CSRF token from header or request body
export const validateCsrfToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      return responseHandler.unauthorized(res, AuthErrors.TOKEN_REQUIRED);
    }

    // Extract CSRF token from request (header takes precedence, then body)
    const csrfToken = req.headers["x-csrf-token"] || req.body?.csrfToken;
    if (!csrfToken) {
      securityAuditService.log("security:csrf_missing", req.user?.userId || "anonymous", {
        ip: req.ip,
        path: req.path,
      });
      return responseHandler.error(res, "Missing CSRF token", 403);
    }

    // Validate token
    const isValid = await csrfService.validate(csrfToken as string, sessionId);
    if (!isValid) {
      securityAuditService.log("security:csrf_invalid", req.user?.userId || "anonymous", {
        ip: req.ip,
        path: req.path,
      });
      return responseHandler.error(res, "Invalid or expired CSRF token", 403);
    }

    next();
  } catch (error) {
    return responseHandler.error(res, "CSRF validation failed", 500);
  }
};

// Validate session metadata (IP, User-Agent) to detect hijacking
export const validateSessionMetadata = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user as any;
    if (!user || !user.sessionMetadata) {
      return next();
    }

    const currentMetadata: SessionMetadata = {
      ip: (req.ip || req.connection.remoteAddress || "unknown") as string,
      userAgent: req.headers["user-agent"] || "unknown",
    };

    const storedMetadata = user.sessionMetadata as SessionMetadata;

    // In development, allow IP changes (VPN, mobile hotspot)
    // In production, use strict validation
    const validation = sessionSecurityService.validateMetadata(currentMetadata, storedMetadata, {
      allowIpChange: !process.env.NODE_ENV?.includes("prod"),
      uaSimilarityThreshold: 0.7,
    });

    if (!validation.isValid) {
      securityAuditService.log("security:session_hijacking_attempt", user.userId, {
        reason: validation.reason,
        currentIp: currentMetadata.ip,
        storedIp: storedMetadata.ip,
        path: req.path,
      });
      clearCookie(res, "sessionId");
      return responseHandler.unauthorized(res, "Session validation failed. Please log in again.");
    }

    next();
  } catch (error) {
    // Non-critical, continue
    next();
  }
};

export default {
  csrfTokenMiddleware,
  validateCsrfToken,
  validateSessionMetadata,
};
