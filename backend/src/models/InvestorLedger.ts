import mongoose from "mongoose";

const investorTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["investment", "repayment"], required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    note: { type: String, default: "", trim: true },
  },
  { _id: true }
);

const investorLedgerSchema = new mongoose.Schema(
  {
    investorName: { type: String, required: true, trim: true },
    investorType: { type: String, enum: ["investor", "trustee", "other"], required: true },
    contact: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    transactions: { type: [investorTransactionSchema], default: [] },
  },
  { timestamps: true }
);

investorLedgerSchema.index({ schoolId: 1, investorName: 1 });

export default mongoose.model("InvestorLedger", investorLedgerSchema);
