import mongoose from "mongoose";

const examUploadSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    teacherName: { type: String, required: true, trim: true },
    documentName: { type: String, default: "" },
    documentData: { type: String, default: "" },
    comment: { type: String, default: "", trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    examType: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    examDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    instructions: { type: String, default: "", trim: true },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
    createdByRole: { type: String, default: "school_admin", trim: true },
    documentName: { type: String, default: "" },
    documentData: { type: String, default: "" },
    teacherComment: { type: String, default: "", trim: true },
    uploads: { type: [examUploadSchema], default: [] },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Exam", examSchema);
