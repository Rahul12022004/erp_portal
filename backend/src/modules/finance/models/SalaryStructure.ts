import mongoose from "mongoose";

const earningComponentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true }, // e.g., "Basic Salary", "HRA", "DA", etc.
    amount: { type: Number, required: true, min: 0 }, // Fixed amount for this earning
  },
  { _id: false }
);

const deductionComponentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true }, // e.g., "Income Tax", "Transport", etc.
    type: { type: String, enum: ["percentage", "amount"], required: true }, // "percentage" or "amount"
    value: { type: Number, required: true, min: 0 }, // If percentage: 0-100, if amount: fixed value
  },
  { _id: false }
);

const salaryStructureSchema = new mongoose.Schema(
  {
    structureName: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true }, // e.g., "Teacher", "Principal", "HOD", etc.
    earnings: { type: [earningComponentSchema], required: true, default: [] },
    deductions: { type: [deductionComponentSchema], required: true, default: [] },
    presentDays: { type: Number, default: 0 }, // Total present days in the month
    absentDays: { type: Number, default: 0 }, // Total absent days in the month
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

// Index for efficient queries
salaryStructureSchema.index({ schoolId: 1, position: 1 });
salaryStructureSchema.index({ schoolId: 1, status: 1 });

export default mongoose.model("SalaryStructure", salaryStructureSchema);
