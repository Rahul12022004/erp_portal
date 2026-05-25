import { EventEmitter2 } from "eventemitter2";

type ListenerFn = (...args: unknown[]) => void;
import { logger } from "../../infrastructure/logger";
import type { EventName } from "./eventNames";
import type { DomainEventMap, PayloadOf } from "./domainEvents";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubscribeOptions {
  /** How many times to retry on handler error. Default: 3 */
  maxRetries?: number;
  /** Base delay between retries in ms (doubles each attempt). Default: 500 */
  retryDelayMs?: number;
  /** Max ms a handler may run before it is considered timed-out. Default: 8000 */
  timeoutMs?: number;
}

export interface DeadLetterEntry {
  event: string;
  payload: unknown;
  error: string;
  attempts: number;
  lastAttempt: string;
}

export type TypedHandler<E extends EventName> = (
  payload: PayloadOf<E>
) => void | Promise<void>;

export type LooseHandler<T = unknown> = (payload: T) => void | Promise<void>;

// ── Bus implementation ────────────────────────────────────────────────────────

class EventBus {
  private readonly emitter: EventEmitter2;
  private readonly dlq: DeadLetterEntry[] = [];
  private readonly DLQ_CAPACITY = 500;

  constructor() {
    this.emitter = new EventEmitter2({
      wildcard: true,
      delimiter: ".",
      maxListeners: 100,
      verboseMemoryLeak: true,
    });
  }

  /**
   * Fire-and-forget publish. Handlers run asynchronously on next tick.
   * Caller is never blocked or rejected — safe to use in request handlers.
   */
  publish<E extends EventName>(event: E, payload: PayloadOf<E>): void;
  publish(event: string, payload: unknown): void;
  publish(event: string, payload: unknown): void {
    logger.info(`[EventBus] publish:${event}`);
    setImmediate(() => {
      this.emitter.emit(event, payload);
    });
  }

  /**
   * Awaitable publish. Resolves when all handlers complete.
   * Use in jobs / tests where you need deterministic ordering.
   */
  async publishAsync<E extends EventName>(
    event: E,
    payload: PayloadOf<E>
  ): Promise<void>;
  async publishAsync(event: string, payload: unknown): Promise<void>;
  async publishAsync(event: string, payload: unknown): Promise<void> {
    logger.info(`[EventBus] publishAsync:${event}`);
    await (this.emitter as EventEmitter2 & { emitAsync(e: string, ...args: unknown[]): Promise<unknown[]> }).emitAsync(event, payload);
  }

  /**
   * Register a typed handler for a named event.
   *
   * The handler is wrapped with:
   *   - timeout protection  (crashes app if handler hangs)
   *   - exponential retry   (on transient errors)
   *   - dead-letter capture (after max retries)
   *
   * Errors are NEVER re-thrown to the emitter — a failed handler cannot
   * crash the application or affect other listeners on the same event.
   */
  subscribe<E extends EventName>(
    event: E,
    handler: TypedHandler<E>,
    options?: SubscribeOptions
  ): void;
  subscribe<T>(
    event: string,
    handler: LooseHandler<T>,
    options?: SubscribeOptions
  ): void;
  subscribe(
    event: string,
    handler: LooseHandler,
    options: SubscribeOptions = {}
  ): void {
    const { maxRetries = 3, retryDelayMs = 500, timeoutMs = 8000 } = options;

    const wrapped = async (payload: unknown): Promise<void> => {
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          await this.runWithTimeout(handler(payload), timeoutMs, event);
          return;
        } catch (err) {
          attempt++;
          const msg = err instanceof Error ? err.message : String(err);

          if (attempt > maxRetries) {
            logger.error(`[EventBus] handler exhausted retries`, {
              event,
              error: msg,
              attempts: attempt,
            });
            this.pushDLQ(event, payload, msg, attempt);
            return; // swallow — must NOT propagate
          }

          const delay = retryDelayMs * 2 ** (attempt - 1);
          logger.warn(`[EventBus] handler error — retry ${attempt}/${maxRetries} in ${delay}ms`, {
            event,
            error: msg,
          });
          await this.sleep(delay);
        }
      }
    };

    this.emitter.on(event, wrapped as ListenerFn);
    logger.debug(`[EventBus] subscribed:${event}`);
  }

  unsubscribe(event: string, handler: LooseHandler): void {
    this.emitter.off(event, handler as ListenerFn);
  }

  /** Inspect what is sitting in the dead-letter queue. */
  getDeadLetterQueue(): Readonly<DeadLetterEntry[]> {
    return this.dlq;
  }

  /** Remove and return all DLQ entries (e.g. for reprocessing or alerting). */
  drainDeadLetterQueue(): DeadLetterEntry[] {
    return this.dlq.splice(0, this.dlq.length);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async runWithTimeout(
    result: void | Promise<void>,
    ms: number,
    event: string
  ): Promise<void> {
    if (!(result instanceof Promise)) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Handler timeout after ${ms}ms [event: ${event}]`)),
        ms
      );
    });

    try {
      await Promise.race([result, timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private pushDLQ(
    event: string,
    payload: unknown,
    error: string,
    attempts: number
  ): void {
    if (this.dlq.length >= this.DLQ_CAPACITY) {
      this.dlq.shift(); // evict oldest when full
    }
    const entry: DeadLetterEntry = {
      event,
      payload,
      error,
      attempts,
      lastAttempt: new Date().toISOString(),
    };
    this.dlq.push(entry);
    logger.warn(`[EventBus] DLQ +1 (size=${this.dlq.length})`, { event, error });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const eventBus = new EventBus();
