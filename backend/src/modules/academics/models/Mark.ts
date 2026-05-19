import mongoose from "mongoose";

const markSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
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
    className: { type: String, required: true, trim: true },
    obtainedMarks: { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, required: true, min: 1, default: 100 },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

markSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export default mongoose.model("Mark", markSchema);
