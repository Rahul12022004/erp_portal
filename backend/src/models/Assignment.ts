import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    className: { type: String, required: true, trim: true },
    dueDate: { type: String, default: "" },
    fileName: { type: String, default: "" },
    fileData: { type: String, default: "" },
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

export default mongoose.model("Assignment", assignmentSchema);
