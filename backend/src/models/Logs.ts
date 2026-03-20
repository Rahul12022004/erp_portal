import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    action: String, // "CREATE_SCHOOL", "UPGRADE_PLAN"
    message: String,
    user: String, // "Super Admin"
    schoolId: String,
  },
  { timestamps: true }
);

export default mongoose.model("Log", logSchema);