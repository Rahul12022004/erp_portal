import mongoose from "mongoose";

const financeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["student_fee", "staff_salary", "other"],
      required: true
    },
    // For student fees
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: function() { return this.type === "student_fee"; }
    },
    // For staff salaries
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: function() { return this.type === "staff_salary"; }
    },
    // Common fields
    amount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueDate: String,
    paymentDate: String,
    status: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue"],
      default: "pending"
    },
    description: String,
    academicYear: String,
    // For other expenses/income
    category: String, // e.g., "Maintenance", "Equipment", "Events", "Miscellaneous"
    transactionType: {
      type: String,
      enum: ["income", "expense"],
      required: function() { return this.type === "other"; }
    },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

// Add indexes for better query performance
financeSchema.index({ schoolId: 1, type: 1 });
financeSchema.index({ studentId: 1 });
financeSchema.index({ staffId: 1 });

export default mongoose.model("Finance", financeSchema);