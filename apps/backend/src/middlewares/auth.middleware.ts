import { auth } from "@repo/auth/server";
import { fromNodeHeaders } from "better-auth/node";
import { NextFunction, Request, Response } from "express";
import { SessionUser } from "../types/session";

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = session.user;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Authentication error");
    res.status(401).json({ message: "Unauthorized" });
  }
}

export default authMiddleware;
