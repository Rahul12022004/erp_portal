import { randomUUID } from "crypto";
import type { BaseEvent } from "./domainEvents";

/**
 * Stamp a domain event payload with the required BaseEvent fields.
 * Usage:
 *   const payload = createEvent({ schoolId }, { studentId, classId, ... });
 */
export function createEvent<T extends Omit<BaseEvent, "eventId" | "timestamp" | "version">>(
  base: { schoolId: string; version?: number },
  fields: Omit<T, keyof BaseEvent>
): T {
  return {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    version: base.version ?? 1,
    schoolId: base.schoolId,
    ...fields,
  } as unknown as T;
}
