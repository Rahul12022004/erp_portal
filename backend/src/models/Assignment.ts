import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  { name: { type: String, required: true }, url: { type: String, required: true } },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    schoolId:     { type: mongoose.Schema.Types.ObjectId, ref: "School",  required: true },
    classId:      { type: mongoose.Schema.Types.ObjectId, ref: "Class",   default: null },
    className:    { type: String, required: true, trim: true },
    subject:      { type: String, default: "", trim: true },
    title:        { type: String, required: true, trim: true },
    instructions: { type: String, default: "" },
    dueDate:      { type: Date,   default: null },
    totalPoints:  { type: Number, default: 100 },
    attachments:  { type: [attachmentSchema], default: [] },
    teacherId:    { type: mongoose.Schema.Types.ObjectId, ref: "Staff",   required: true },
    status:       { type: String, enum: ["DRAFT", "PUBLISHED", "CLOSED"], default: "PUBLISHED" },
    // legacy fields kept for backward compatibility
    description:  { type: String, default: "" },
    fileName:     { type: String, default: "" },
    fileData:     { type: String, default: "" },
  },
  { timestamps: true, collection: "assignments" }
);

assignmentSchema.index({ schoolId: 1, classId: 1, status: 1 });
assignmentSchema.index({ schoolId: 1, teacherId: 1 });
assignmentSchema.index({ schoolId: 1, className: 1 });

export default mongoose.model("Assignment", assignmentSchema);
