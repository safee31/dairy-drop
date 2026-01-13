import { Request, Response, NextFunction } from "express";
import { clearCookie } from "@/utils/jwt";
import { loginSessionService } from "@/utils/redis/loginSession";
import { AuthErrors } from "@/utils/customError";
import { responseHandler } from "@/middleware/responseHandler";
import { UserRepo } from "@/models/repositories";

declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        userId: string;
        sessionId: string;
        role?: {
          id: string;
          type: number;
          name: string;
          description: string | null;
          permissions: Record<string, boolean>;
          isActive: boolean;
        };
        sessionMetadata?: {
          ip: string;
          userAgent: string;
        };
      };
    }
  }
}

// Validate login session middleware
const validateLoginSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies?.sessionId as string | undefined;

    if (!sessionId) {
      return responseHandler.unauthorized(res, AuthErrors.TOKEN_REQUIRED);
    }

    const isRevoked = await loginSessionService.isSessionRevoked(sessionId);
    if (isRevoked) {
      clearCookie(res, "sessionId");
      return responseHandler.unauthorized(res, AuthErrors.INVALID_TOKEN);
    }

    const clientIp = (req.ip || req.connection.remoteAddress || "unknown") as string;
    const validation = await loginSessionService.validateSession(sessionId, clientIp);

    if (!validation.isValid) {
      const doClear = validation.reason === "Session revoked" || validation.reason === "Session not found" || validation.reason === "Session not found in user bucket";
      if (doClear) clearCookie(res, "sessionId");
      return responseHandler.unauthorized(res, AuthErrors.INVALID_TOKEN);
    }

    // Fetch user with role information
    const user = await UserRepo.findOne({
      where: { id: validation.userId! },
      relations: ["role"],
    });

    req.user = {
      email: validation.email!,
      userId: validation.userId!,
      sessionId: sessionId,
      ...(user?.role && {
        role: {
          id: user.role.id,
          type: user.role.type,
          name: user.role.name,
          description: user.role.description,
          permissions: user.role.permissions,
          isActive: user.role.isActive,
        },
      }),
      sessionMetadata: {
        ip: clientIp,
        userAgent: (req.headers["user-agent"] || "unknown") as string,
      },
    };

    next();
  } catch (error) {
    return responseHandler.error(res, "Internal server error", 500);
  }
};

// Optional authentication middleware: non-fatal
const optionalLoginSession = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies?.sessionId as string | undefined;
    if (!sessionId) return next();

    const clientIp = (req.ip || req.connection.remoteAddress || "unknown") as string;
    const validation = await loginSessionService.validateSession(sessionId, clientIp);

    if (validation.isValid) {
      // Fetch user with role information
      const user = await UserRepo.findOne({
        where: { id: validation.userId! },
        relations: ["role"],
      });

      req.user = {
        email: validation.email!,
        userId: validation.userId!,
        sessionId: sessionId,
        ...(user?.role && {
          role: {
            id: user.role.id,
            type: user.role.type,
            name: user.role.name,
            description: user.role.description,
            permissions: user.role.permissions,
            isActive: user.role.isActive,
          },
        }),
        sessionMetadata: {
          ip: clientIp,
          userAgent: (req.headers["user-agent"] || "unknown") as string,
        },
      };
    }

    next();
  } catch {
    next();
  }
};

export const sessionAuth = {
  validateLoginSession,
  optionalLoginSession,
};

export { validateLoginSession, optionalLoginSession };
export default sessionAuth;
