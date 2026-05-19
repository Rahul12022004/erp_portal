import jwt from "jsonwebtoken";

export type AuthTokenPayload = {
  userId: string;
  email: string;
  role: "super-admin" | "school-admin" | "teacher";
  schoolId?: string;
};

const TOKEN_TTL = (process.env.JWT_EXPIRES_IN || "12h") as jwt.SignOptions["expiresIn"];

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-only-jwt-secret-change-in-production";
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}
