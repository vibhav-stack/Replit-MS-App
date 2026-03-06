import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}
const JWT_SECRET = process.env.SESSION_SECRET;
const JWT_EXPIRATION = "7d";

export interface AuthPayload {
  userId: string;
  email: string;
  role: "clinician" | "patient";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireClinician(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "clinician") {
    return res.status(403).json({ message: "Clinician access required" });
  }
  next();
}

export function requirePatient(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "patient") {
    return res.status(403).json({ message: "Patient access required" });
  }
  next();
}
