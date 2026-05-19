import mongoose, { Document, Schema } from "mongoose";

export interface IMessageTemplate extends Document {
  tenantId?: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  name: string;
  subject?: string;
  body: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageTemplateSchema = new Schema<IMessageTemplate>(
  {
    tenantId: { type: Schema.Types.ObjectId, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
    category: { type: String, default: "General", trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<IMessageTemplate>("MessageTemplate", messageTemplateSchema);
