import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    // Basic Information
    expenseDate: {
      type: Date,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    notes: String,

    // Classification
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
    },
    subcategory: String,
    department: String,
    expenseType: {
      type: String,
      enum: ["operational", "capital", "maintenance", "event"],
      default: "operational",
    },

    // Amount & Payment Details
    amount: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    paymentMode: {
      type: String,
      enum: ["cash", "bank_transfer", "upi", "credit_card", "cheque"],
      required: true,
    },
    transactionReferenceNumber: String,
    billNumber: String,

    // Vendor Information
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    vendorName: String,

    // Document & Compliance
    receiptUrl: String,
    invoiceUrl: String,
    receipts: [
      {
        url: String,
        fileName: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Recording Information
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    recordedDate: {
      type: Date,
      default: Date.now,
    },

    // Recurring Expense
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: ["weekly", "monthly", "quarterly", "annual"],
    },
    recurringEndDate: Date,

    // Approval Workflow
    status: {
      type: String,
      enum: ["draft", "submitted", "pending_approval", "approved", "rejected", "paid"],
      default: "draft",
    },
    approvalLevel: {
      type: Number,
      default: 1,
    },
    approvalHistory: [
      {
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Staff",
        },
        approvalDate: Date,
        remarks: String,
        level: Number,
      },
    ],
    rejectionReason: String,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },

    // Finance Integration
    financeRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Finance",
    },
    ledgerEntryId: String,
    isReconciled: {
      type: Boolean,
      default: false,
    },

    // School & Organization
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    // Tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
expenseSchema.index({ schoolId: 1, expenseDate: -1 });
expenseSchema.index({ schoolId: 1, status: 1 });
expenseSchema.index({ categoryId: 1, expenseDate: -1 });
expenseSchema.index({ vendorId: 1 });
expenseSchema.index({ recordedBy: 1 });
expenseSchema.index({ status: 1, approvalLevel: 1 });

export default mongoose.model("Expense", expenseSchema);
