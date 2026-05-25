import bcrypt from "bcryptjs";
import { signAuthToken, type AuthTokenPayload } from "../../../core/utils/jwt";
import {
  clearLoginFailures,
  getLoginBlockInfo,
  getLoginThrottleKey,
  recordLoginFailure,
} from "../../../core/utils/loginThrottle";
import { getEnv } from "../../../core/config/env";
import type { Request } from "express";

export interface ThrottleResult {
  blocked: boolean;
  retryAfterSeconds?: number;
}

export const AuthService = {
  checkThrottle(req: Request, email: string): ThrottleResult {
    const key = getLoginThrottleKey(req.ip, String(email || ""));
    return getLoginBlockInfo(key);
  },

  getThrottleKey(req: Request, email: string): string {
    return getLoginThrottleKey(req.ip, String(email || ""));
  },

  recordFailure(throttleKey: string): void {
    recordLoginFailure(throttleKey);
  },

  clearFailures(throttleKey: string): void {
    clearLoginFailures(throttleKey);
  },

  async verifyPassword(plaintext: string, stored: string): Promise<boolean> {
    if (!stored) return false;
    return stored.startsWith("$2")
      ? bcrypt.compare(plaintext, stored)
      : stored === plaintext;
  },

  async upgradePasswordIfPlain(plaintext: string, stored: string): Promise<string | null> {
    if (stored.startsWith("$2")) return null;
    return bcrypt.hash(plaintext, 12);
  },

  issueToken(payload: AuthTokenPayload): string {
    return signAuthToken(payload);
  },

  getSuperAdminCredentials() {
    const env = getEnv();
    return { email: env.superAdminEmail, password: env.superAdminPassword };
  },

  isGmailAddress(email: string): boolean {
    return /^[^\s@]+@gmail\.com$/.test(String(email || "").trim().toLowerCase());
  },
};
