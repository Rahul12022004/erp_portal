import mongoose from "mongoose";

const expenseCategorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      default: null,
    },
    type: {
      type: String,
      enum: ["maintenance", "utilities", "consumables", "transport", "events", "security", "miscellaneous"],
      default: "miscellaneous",
    },
    budgetLimit: {
      type: Number,
      default: null,
    },
    budgetPeriod: {
      type: String,
      enum: ["monthly", "quarterly", "annual"],
      default: "monthly",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
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
expenseCategorySchema.index({ schoolId: 1, code: 1 });
expenseCategorySchema.index({ schoolId: 1, status: 1 });
expenseCategorySchema.index({ parentCategory: 1 });

export default mongoose.model("ExpenseCategory", expenseCategorySchema);
