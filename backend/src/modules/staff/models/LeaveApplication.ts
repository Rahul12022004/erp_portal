import mongoose from "mongoose";

const leaveApplicationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    leaveType: {
      type: String,
      enum: ["Paid", "Unpaid", "Emergency"],
      default: "Paid",
    },
    fileName: { type: String, default: "" },
    fileData: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
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
  },
  { timestamps: true }
);

export default mongoose.model("LeaveApplication", leaveApplicationSchema);
