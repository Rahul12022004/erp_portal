import pino, { type Logger as PinoLogger } from "pino";

const isDev = (process.env.NODE_ENV ?? "development") !== "production";

export const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: { service: "erp-portal" },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname,service" },
    },
  }),
});

// ── Compat shim ───────────────────────────────────────────────────────────────
// Legacy callers use logger.error("msg", { meta }) — old Winston/console style.
// Pino expects logger.error({ meta }, "msg").
// This shim normalises both call signatures so migration can be gradual.

type LogMeta = Record<string, unknown>;
type CompatLogger = {
  debug(msgOrObj: string | LogMeta, metaOrMsg?: LogMeta | string): void;
  info(msgOrObj: string | LogMeta, metaOrMsg?: LogMeta | string): void;
  warn(msgOrObj: string | LogMeta, metaOrMsg?: LogMeta | string): void;
  error(msgOrObj: string | LogMeta, metaOrMsg?: LogMeta | string): void;
  child(bindings: LogMeta): CompatLogger;
};

function makeCompat(pinoInst: PinoLogger): CompatLogger {
  function wrap(method: keyof Pick<PinoLogger, "debug" | "info" | "warn" | "error">) {
    return (msgOrObj: string | LogMeta, metaOrMsg?: LogMeta | string): void => {
      if (typeof msgOrObj === "string") {
        // Old style: logger.error("msg", { meta })
        (pinoInst[method] as (obj: LogMeta, msg: string) => void)(
          typeof metaOrMsg === "object" ? metaOrMsg : {},
          msgOrObj,
        );
      } else {
        // Pino style: logger.error({ meta }, "msg")
        (pinoInst[method] as (obj: LogMeta, msg?: string) => void)(
          msgOrObj,
          typeof metaOrMsg === "string" ? metaOrMsg : undefined,
        );
      }
    };
  }

  return {
    debug: wrap("debug"),
    info:  wrap("info"),
    warn:  wrap("warn"),
    error: wrap("error"),
    child: (bindings: LogMeta) => makeCompat(pinoInst.child(bindings)),
  };
}

/**
 * Create a child logger scoped to a module.
 * Accepts both pino-style logger.error({ obj }, "msg") and legacy logger.error("msg", { obj }).
 */
export function createLogger(module: string): CompatLogger {
  return makeCompat(rootLogger.child({ module }));
}

// Convenience: single shared logger for infrastructure code
export const logger = createLogger("core");
