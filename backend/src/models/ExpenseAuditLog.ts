import mongoose from "mongoose";

const expenseAuditLogSchema = new mongoose.Schema(
  {
    // Reference Information
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      required: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    // Action Information
    action: {
      type: String,
      enum: [
        "created",
        "edited",
        "submitted",
        "approved",
        "rejected",
        "recalled",
        "paid",
        "cancelled",
        "deleted",
        "receipt_uploaded",
        "status_changed",
      ],
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    performedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Change Details
    previousValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed,
    changedFields: [String],

    // Approval Related
    approvalLevel: Number,
    remarks: String,
    approvalStatus: String,

    // Attachment Related (for receipt uploads)
    attachmentUrl: String,
    attachmentFileName: String,
    attachmentSize: Number,

    // IP & Device Info (for security audit)
    ipAddress: String,
    userAgent: String,

    // Compliance & Audit Fields
    transactionReferenceNumber: String,
    hashValue: String,
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for audit queries
expenseAuditLogSchema.index({ expenseId: 1, action: 1 });
expenseAuditLogSchema.index({ schoolId: 1, performedDate: -1 });
expenseAuditLogSchema.index({ performedBy: 1 });
expenseAuditLogSchema.index({ action: 1 });

export default mongoose.model("ExpenseAuditLog", expenseAuditLogSchema);
