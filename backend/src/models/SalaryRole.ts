import mongoose from "mongoose";

const salaryRoleSchema = new mongoose.Schema(
  {
    roleName: { type: String, required: true, trim: true },
    roleType: { type: String, enum: ["investor", "trustee", "other"], required: true },
    description: { type: String, default: "", trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

salaryRoleSchema.index({ schoolId: 1, roleName: 1 }, { unique: true });

export default mongoose.model("SalaryRole", salaryRoleSchema);
