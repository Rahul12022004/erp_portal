import mongoose from "mongoose";

const budgetMonitorSchema = new mongoose.Schema(
  {
    // School Reference
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    // Budget Period
    fiscalYear: {
      type: String,
      required: true,
      // e.g., "2024-2025"
    },
    month: {
      type: Number,
      min: 1,
      max: 12,
    },
    quarter: {
      type: Number,
      min: 1,
      max: 4,
    },
    budgetType: {
      type: String,
      enum: ["monthly", "quarterly", "annual"],
      required: true,
    },

    // Budget Configuration
    budgets: [
      {
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ExpenseCategory",
        },
        department: String,
        budgetedAmount: {
          type: Number,
          required: true,
          min: 0,
        },
        actualSpent: {
          type: Number,
          default: 0,
        },
        pendingApproval: {
          type: Number,
          default: 0,
        },
        committedAmount: {
          type: Number,
          default: 0,
        },
        variance: {
          type: Number,
          default: 0,
        },
        variancePercentage: Number,
        status: {
          type: String,
          enum: ["within_budget", "near_limit", "over_budget"],
          default: "within_budget",
        },
        lastUpdated: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Overall Budget Summary
    totalBudget: {
      type: Number,
      required: true,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    totalPendingApproval: {
      type: Number,
      default: 0,
    },
    totalCommitted: {
      type: Number,
      default: 0,
    },
    remainingBalance: {
      type: Number,
      default: 0,
    },
    budgetUtilization: {
      type: Number, // Percentage 0-100
      default: 0,
    },

    // Alert Thresholds
    alertThresholds: {
      warningPercentage: {
        type: Number,
        default: 80,
      },
      criticalPercentage: {
        type: Number,
        default: 95,
      },
    },

    // Alerts
    alerts: [
      {
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ExpenseCategory",
        },
        alertType: {
          type: String,
          enum: ["warning", "critical", "exceeded"],
          required: true,
        },
        message: String,
        generatedDate: {
          type: Date,
          default: Date.now,
        },
        acknowledged: {
          type: Boolean,
          default: false,
        },
        acknowledgedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Staff",
        },
      },
    ],

    // Approval Status
    approvalStatus: {
      type: String,
      enum: ["draft", "submitted", "approved", "active"],
      default: "draft",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    approvalDate: Date,

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

// Indexes
budgetMonitorSchema.index({ schoolId: 1, fiscalYear: 1, budgetType: 1 });
budgetMonitorSchema.index({ schoolId: 1, fiscalYear: 1, month: 1 });

export default mongoose.model("BudgetMonitor", budgetMonitorSchema);
