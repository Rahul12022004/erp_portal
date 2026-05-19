import express from "express";
import { verifyAuthToken } from "../utils/jwt";

export function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  try {
    const payload = verifyAuthToken(token);
    (req as express.Request & { user?: unknown; schoolId?: string; userId?: string }).user = payload;
    (req as any).schoolId = payload.schoolId;
    (req as any).userId = payload.userId;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
