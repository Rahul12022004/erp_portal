import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";

export type AuthTokenPayload = {
  userId: string;
  email: string;
  role: "super-admin" | "school-admin" | "teacher";
  schoolId?: string;
};

export function signAuthToken(payload: AuthTokenPayload) {
  const { jwtSecret, jwtExpiresIn } = getEnv();
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyAuthToken(token: string) {
  const { jwtSecret } = getEnv();
  return jwt.verify(token, jwtSecret) as AuthTokenPayload;
}
