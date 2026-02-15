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

const validateLoginSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies?.sessionId as string | undefined;

    if (!sessionId) {
      return responseHandler.unauthorized(res, AuthErrors.SESSION_REQUIRED);
    }

    const isRevoked = await loginSessionService.isSessionRevoked(sessionId);
    if (isRevoked) {
      clearCookie(res, "sessionId");
      return responseHandler.unauthorized(res, AuthErrors.SESSION_REVOKED);
    }

    const clientIp = (req.ip || req.connection.remoteAddress || "unknown") as string;
    const validation = await loginSessionService.validateSession(sessionId, clientIp);

    if (!validation.isValid) {
      clearCookie(res, "sessionId");
      if (validation.reason === "Session expired") {
        return responseHandler.unauthorized(res, AuthErrors.SESSION_EXPIRED);
      }
      return responseHandler.unauthorized(res, AuthErrors.SESSION_NOT_FOUND);
    }

    const user = await UserRepo.findOne({
      where: { id: validation.userId!, isActive: true },
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
    return responseHandler.error(res, "Something went wrong. Please try again later.", 500);
  }
};

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
      const user = await UserRepo.findOne({
        where: { id: validation.userId!, isActive: true },
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
