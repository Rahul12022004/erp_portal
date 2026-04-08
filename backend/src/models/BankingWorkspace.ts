import mongoose from "mongoose";

const bankingAccountSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    accountType: {
      type: String,
      enum: ["Current", "Savings", "Escrow"],
      default: "Current",
    },
    accountNumber: { type: String, required: true, trim: true },
    swift: { type: String, default: "", trim: true },
    currency: { type: String, enum: ["INR", "USD", "EUR"], default: "INR" },
    openingBalance: { type: Number, default: 0, min: 0 },
    internalReference: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Active", "Dormant", "Closed"],
      default: "Active",
    },
  },
  { _id: true }
);

const bankingTransactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    referenceNo: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    accountId: { type: String, required: true, trim: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["paid", "pending", "overdue"],
      default: "paid",
    },
  },
  { _id: true }
);

const bankingLoanSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    referenceNo: { type: String, required: true, trim: true },
    loanType: { type: String, enum: ["taken", "given"], required: true },
    partyName: { type: String, required: true, trim: true },
    principalAmount: { type: Number, required: true, min: 0 },
    interestRate: { type: Number, default: 0, min: 0 },
    startDate: { type: String, required: true, trim: true },
    dueDate: { type: String, required: true, trim: true },
    outstandingAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["active", "pending", "closed"],
      default: "active",
    },
  },
  { _id: true }
);

const bankingAssetSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    assetName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    vendor: { type: String, default: "", trim: true },
    purchaseValue: { type: Number, required: true, min: 0 },
    purchaseDate: { type: String, required: true, trim: true },
    usefulLifeYears: { type: Number, required: true, min: 1 },
    depreciationMethod: {
      type: String,
      enum: ["straight-line", "declining-balance"],
      default: "straight-line",
    },
    location: { type: String, default: "", trim: true },
    department: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["active", "in-use", "under-maintenance", "retired", "disposed"],
      default: "active",
    },
    notes: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const bankingWorkspaceSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, unique: true },
    accounts: { type: [bankingAccountSchema], default: [] },
    transactions: { type: [bankingTransactionSchema], default: [] },
    loans: { type: [bankingLoanSchema], default: [] },
    assets: { type: [bankingAssetSchema], default: [] },
  },
  { timestamps: true }
);

bankingWorkspaceSchema.index({ schoolId: 1 }, { unique: true });

export default mongoose.model("BankingWorkspace", bankingWorkspaceSchema);
