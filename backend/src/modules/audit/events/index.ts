import { eventBus } from "../../../core/events";
import Log from "../../logs/models/Logs";

interface AuditEntryPayload {
  action: string;
  message: string;
  user?: string;
  schoolId?: string;
}

eventBus.subscribe<AuditEntryPayload>("audit.entry", async (payload) => {
  try {
    await Log.create({
      action: payload.action,
      message: payload.message,
      user: payload.user ?? "Super Admin",
      schoolId: payload.schoolId ?? "",
    });
  } catch (err) {
    console.error("AUDIT LOG ERROR:", err);
  }
});

export type { AuditEntryPayload };
