import mongoose from "mongoose";

const feeComponentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const paymentHistorySchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true },
    transactionId: { type: String, required: true },
    paymentDate: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    paymentType: {
      type: String,
      enum: ["upi", "card", "cash", "cheque"],
      default: "cash",
    },
    sentToEmail: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

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
    feeComponents: { type: [feeComponentSchema], default: [] },
    paymentHistory: { type: [paymentHistorySchema], default: [] },
    extensionGrantedAt: String,
    extensionExpiresAt: String,
    extensionGrantedBy: String,
    extensionReason: String,
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
financeSchema.index({ schoolId: 1, type: 1, academicYear: 1 });
financeSchema.index({ studentId: 1 });
financeSchema.index({ staffId: 1 });

export default mongoose.model("Finance", financeSchema);
