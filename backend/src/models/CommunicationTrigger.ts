import mongoose, { Document, Schema } from "mongoose";
import type { ChannelKey } from "./Campaign";

// ─── Event catalogue ──────────────────────────────────────────────────────────

export const EVENT_TYPES = [
  "ATTENDANCE_ABSENT",
  "ATTENDANCE_LATE",
  "FEE_DUE_SOON",
  "FEE_OVERDUE",
  "FEE_PAYMENT_RECEIVED",
  "EXAM_TIMETABLE_PUBLISHED",
  "RESULT_PUBLISHED",
  "NEW_ASSIGNMENT",
  "ASSIGNMENT_DUE_SOON",
  "LIBRARY_BOOK_OVERDUE",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "PARENT_MEETING_REMINDER",
  "ADMISSION_CONFIRMED",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

// ─── TypeScript interfaces ────────────────────────────────────────────────────

export interface ITriggerChannelConfig {
  channel: ChannelKey;
  templateId?: mongoose.Types.ObjectId;
  config?: Record<string, unknown>;
}

export interface ICommunicationTrigger extends Document {
  tenantId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  name: string;
  eventType: EventType;
  isEnabled: boolean;
  channels: ITriggerChannelConfig[];
  /**
   * Simple key-value filter applied against the domain event payload.
   * Every key present in filter must match the corresponding payload value.
   * Omit or set to {} to match all events of this type.
   * Example: { "class": "10A" } fires only for class-10A absence events.
   */
  filter: Record<string, unknown>;
  /**
   * Handlebars-style template: {{studentName}}, {{parentName}}, {{amount}}, etc.
   * Falls back to a built-in default per eventType when omitted.
   */
  titleTemplate?: string;
  bodyTemplate?: string;
  audienceType: "PARENTS" | "STUDENTS" | "STAFF" | "ALL";
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const triggerChannelSchema = new Schema<ITriggerChannelConfig>(
  {
    channel: {
      type: String,
      enum: ["APP", "EMAIL", "SMS", "WHATSAPP", "FACEBOOK", "INSTAGRAM"],
      required: true,
    },
    templateId: { type: Schema.Types.ObjectId, ref: "MessageTemplate" },
    config: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const communicationTriggerSchema = new Schema<ICommunicationTrigger>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    eventType: { type: String, enum: EVENT_TYPES, required: true, index: true },
    isEnabled: { type: Boolean, default: true, index: true },
    channels: { type: [triggerChannelSchema], default: [] },
    filter: { type: Schema.Types.Mixed, default: {} },
    titleTemplate: { type: String },
    bodyTemplate: { type: String },
    audienceType: {
      type: String,
      enum: ["PARENTS", "STUDENTS", "STAFF", "ALL"],
      default: "PARENTS",
    },
  },
  { timestamps: true, collection: "communication_triggers" }
);

// Fast lookup: "give me all enabled triggers for this school + event"
communicationTriggerSchema.index({ schoolId: 1, eventType: 1, isEnabled: 1 });
communicationTriggerSchema.index({ tenantId: 1, schoolId: 1, eventType: 1, isEnabled: 1 });

export default mongoose.model<ICommunicationTrigger>(
  "CommunicationTrigger",
  communicationTriggerSchema
);
