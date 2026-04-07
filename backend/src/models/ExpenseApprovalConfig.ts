import mongoose from "mongoose";

const expenseApprovalConfigSchema = new mongoose.Schema(
  {
    // School Reference
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      unique: true,
      index: true,
    },

    // Approval Levels & Thresholds
    approvalLevels: [
      {
        level: {
          type: Number,
          required: true,
        },
        role: {
          type: String,
          required: true,
          // e.g., "department_head", "finance_officer", "principal", "management"
        },
        minAmount: {
          type: Number,
          required: true,
          default: 0,
        },
        maxAmount: {
          type: Number,
          required: true,
          default: Number.MAX_VALUE,
        },
        approvers: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Staff",
          },
        ],
        requiresDocument: {
          type: Boolean,
          default: true,
        },
        requiresVendorDetails: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Auto-Approval Rules
    autoApproveUnderAmount: {
      type: Number,
      default: 5000,
    },
    autoApprovalEnabled: {
      type: Boolean,
      default: false,
    },

    // Escalation Rules
    escalationRules: [
      {
        criterion: String, // e.g., "amount_exceeds", "category", "department"
        value: mongoose.Schema.Types.Mixed,
        escalateTo: {
          type: String,
          enum: ["management", "principal", "finance_head"],
        },
      },
    ],

    // Notification Settings
    notificationSettings: {
      notifyApproversEmail: {
        type: Boolean,
        default: true,
      },
      notifySubmitterOnApproval: {
        type: Boolean,
        default: true,
      },
      notifyFinanceOnApproval: {
        type: Boolean,
        default: true,
      },
      reminderDays: {
        type: Number,
        default: 3,
      },
    },

    // Policies
    requiresReceiptForAllExpenses: {
      type: Boolean,
      default: true,
    },
    allowCashExpensesAbove: {
      type: Number,
      default: Number.MAX_VALUE,
    },
    requiresBillNumber: {
      type: Boolean,
      default: true,
    },
    requiresGSTDetails: {
      type: Boolean,
      default: true,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // Audit
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

export default mongoose.model("ExpenseApprovalConfig", expenseApprovalConfigSchema);
