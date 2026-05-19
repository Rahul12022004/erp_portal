import mongoose from "mongoose";

const studentFeePaymentSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    student_fee_assignment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentFeeAssignment",
      required: true,
    },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    payment_date: { type: String, required: true, trim: true },
    payment_amount: { type: Number, required: true, min: 0 },
    payment_mode: {
      type: String,
      enum: ["cash", "upi", "card", "cheque", "bank_transfer"],
      default: "cash",
    },
    reference_no: { type: String, default: "", trim: true },
    remarks: { type: String, default: "", trim: true },
    receipt_no: { type: String, required: true, trim: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

studentFeePaymentSchema.index({ school_id: 1, receipt_no: 1 }, { unique: true });
studentFeePaymentSchema.index({ school_id: 1, student_id: 1, payment_date: -1 });
studentFeePaymentSchema.index({ school_id: 1, student_fee_assignment_id: 1, payment_date: -1 });

export default mongoose.model("StudentFeePayment", studentFeePaymentSchema);
