import dotenv from "dotenv";
import fs from "fs";
import path from "path";

let environmentLoaded = false;

export function loadEnvironment() {
  if (environmentLoaded) return;
  const cwd = process.cwd();
  const defaultEnvPath = path.resolve(cwd, ".env");
  if (fs.existsSync(defaultEnvPath)) dotenv.config({ path: defaultEnvPath, override: false });
  const nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
  if (nodeEnv === "production") {
    const prodPath = path.resolve(cwd, ".env.production");
    if (fs.existsSync(prodPath)) dotenv.config({ path: prodPath, override: true });
  }
  environmentLoaded = true;
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val || !val.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val.trim();
}

function optionalEnv(key: string, fallback: string): string {
  return (process.env[key] || "").trim() || fallback;
}

export function buildEnv() {
  const nodeEnv = optionalEnv("NODE_ENV", "development");
  const jwtSecret = optionalEnv("JWT_SECRET", "dev-only-jwt-secret-change-in-production");

  if (nodeEnv === "production" && jwtSecret === "dev-only-jwt-secret-change-in-production") {
    throw new Error("JWT_SECRET must be set in production. The dev fallback is not safe.");
  }

  return {
    nodeEnv,
    mongoUri: requireEnv("MONGO_URI"),
    jwtSecret,
    jwtExpiresIn: optionalEnv("JWT_EXPIRES_IN", "12h"),
    port: Number(optionalEnv("PORT", "5000")),
    frontendOrigins: optionalEnv("FRONTEND_ORIGINS", "")
      .split(",").map(s => s.trim()).filter(Boolean),
    seedLocalData: optionalEnv("SEED_LOCAL_DATA", "false") === "true",
    superAdminEmail: optionalEnv("SUPER_ADMIN_EMAIL", ""),
    superAdminPassword: optionalEnv("SUPER_ADMIN_PASSWORD", ""),
    smtpHost: optionalEnv("SMTP_HOST", "smtp.gmail.com"),
    smtpPort: Number(optionalEnv("SMTP_PORT", "587")),
    smtpSecure: optionalEnv("SMTP_SECURE", "false").toLowerCase() === "true",
    smtpUser: optionalEnv("SMTP_USER", "") || optionalEnv("EMAIL_USER", ""),
    smtpPass: optionalEnv("SMTP_PASS", "") || optionalEnv("EMAIL_PASSWORD", ""),
    smtpFrom: optionalEnv("SMTP_FROM", "") || optionalEnv("SMTP_USER", "") || optionalEnv("EMAIL_USER", "noreply@erp-portal.com"),
    groqApiKey: optionalEnv("GROQ_API_KEY", ""),
    groqModel: optionalEnv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    geminiApiKey: optionalEnv("GEMINI_API_KEY", ""),
    redisUrl:   optionalEnv("REDIS_URL", "redis://localhost:6379"),
    sentryDsn:  optionalEnv("SENTRY_DSN", ""),
    logLevel:   optionalEnv("LOG_LEVEL", "info"),
    appVersion: optionalEnv("APP_VERSION", "dev"),
  } as const;
}

export type AppEnv = ReturnType<typeof buildEnv>;

let _env: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!_env) throw new Error("env not initialised — call initEnv() first");
  return _env;
}

export function initEnv(): AppEnv {
  loadEnvironment();
  _env = buildEnv();
  return _env;
}
