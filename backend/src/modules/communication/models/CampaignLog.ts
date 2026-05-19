import mongoose, { Document, Schema } from "mongoose";
import type { ChannelKey } from "./Campaign";

// ─── TypeScript interface ─────────────────────────────────────────────────────

export interface ICampaignLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  channel: ChannelKey;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  details?: unknown;
  createdAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const campaignLogSchema = new Schema<ICampaignLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    channel: {
      type: String,
      enum: ["APP", "EMAIL", "SMS", "WHATSAPP", "FACEBOOK", "INSTAGRAM"],
      required: true,
    },
    status: {
      type: String,
      enum: ["QUEUED", "SENT", "DELIVERED", "FAILED"],
      required: true,
      index: true,
    },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "campaign_logs" }
);

// Compound indexes for aggregation queries used in /stats
campaignLogSchema.index({ schoolId: 1, channel: 1, status: 1, createdAt: -1 });
campaignLogSchema.index({ campaignId: 1, status: 1 });

export default mongoose.model<ICampaignLog>("CampaignLog", campaignLogSchema);
