import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    examType: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    examDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    documentName: { type: String, default: "" },
    documentData: { type: String, default: "" },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Exam", examSchema);
