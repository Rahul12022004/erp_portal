import mongoose, { Document, Schema } from "mongoose";

// ─── TypeScript interfaces ────────────────────────────────────────────────────

export type ChannelKey = "APP" | "EMAIL" | "SMS" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM";

export interface ICampaignChannel {
  channel: ChannelKey;
  isEnabled: boolean;
  templateId?: mongoose.Types.ObjectId;
  config?: Record<string, unknown>;
}

export interface ICampaignAudience {
  type: "PARENTS" | "STUDENTS" | "STAFF";
  classes?: string[];
  tags?: string[];
}

export interface ICampaign extends Document {
  tenantId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  title: string;
  subtitle?: string;
  internalNote?: string;
  publicCaption?: string;
  body: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  status: "DRAFT" | "SCHEDULED" | "SENT" | "CANCELLED";
  scheduledAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvalStatus: "NONE" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  approvalComment?: string;
  channels: ICampaignChannel[];
  audience: ICampaignAudience[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const campaignChannelSchema = new Schema<ICampaignChannel>(
  {
    channel: {
      type: String,
      enum: ["APP", "EMAIL", "SMS", "WHATSAPP", "FACEBOOK", "INSTAGRAM"],
      required: true,
    },
    isEnabled: { type: Boolean, default: true },
    templateId: { type: Schema.Types.ObjectId, ref: "MessageTemplate" },
    config: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const campaignAudienceSchema = new Schema<ICampaignAudience>(
  {
    type: {
      type: String,
      enum: ["PARENTS", "STUDENTS", "STAFF"],
      required: true,
    },
    classes: [{ type: String }],
    tags: [{ type: String }],
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const campaignSchema = new Schema<ICampaign>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    internalNote: { type: String },
    publicCaption: { type: String },
    body: { type: String, required: true },
    priority: { type: String, enum: ["LOW", "NORMAL", "HIGH"], default: "NORMAL" },
    status: {
      type: String,
      enum: ["DRAFT", "SCHEDULED", "SENT", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    scheduledAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    approvedBy: { type: Schema.Types.ObjectId },
    approvalStatus: {
      type: String,
      enum: ["NONE", "PENDING_REVIEW", "APPROVED", "REJECTED"],
      default: "NONE",
    },
    approvalComment: { type: String },
    channels: { type: [campaignChannelSchema], default: [] },
    audience: { type: [campaignAudienceSchema], default: [] },
  },
  { timestamps: true, collection: "campaigns" }
);

// Compound index for efficient school-scoped queries
campaignSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
campaignSchema.index({ tenantId: 1, schoolId: 1, status: 1 });

export default mongoose.model<ICampaign>("Campaign", campaignSchema);
