import mongoose from "mongoose";

const studentFeeAssignmentSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    class_fee_structure_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassFeeStructure",
      required: true,
    },
    academic_year: { type: String, required: true, trim: true },
    academic_fee: { type: Number, required: true, default: 0, min: 0 },
    transport_fee: { type: Number, required: true, default: 0, min: 0 },
    other_fee: { type: Number, required: true, default: 0, min: 0 },
    discount_amount: { type: Number, required: true, default: 0, min: 0 },
    total_fee: { type: Number, required: true, default: 0, min: 0 },
    paid_amount: { type: Number, required: true, default: 0, min: 0 },
    due_amount: { type: Number, required: true, default: 0 },
    fee_status: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "PAID", "OVERDUE"],
      default: "UNPAID",
    },
    due_date: { type: String, required: true, trim: true },
    last_payment_date: { type: String, default: null },
    late_fee_amount: { type: Number, required: true, default: 0, min: 0 },
    late_fee_applied_date: { type: String, default: null },
    late_fee_reason: { type: String, default: null },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

studentFeeAssignmentSchema.index(
  { school_id: 1, student_id: 1, class_fee_structure_id: 1, academic_year: 1 },
  { unique: true }
);
studentFeeAssignmentSchema.index({ school_id: 1, student_id: 1, fee_status: 1 });
studentFeeAssignmentSchema.index({ school_id: 1, class_fee_structure_id: 1, academic_year: 1 });
studentFeeAssignmentSchema.index({ school_id: 1, academic_year: 1, fee_status: 1 });
studentFeeAssignmentSchema.index({ school_id: 1, student_id: 1, academic_year: -1, created_at: -1 });
studentFeeAssignmentSchema.index({ school_id: 1, created_at: -1 });

export default mongoose.model("StudentFeeAssignment", studentFeeAssignmentSchema);
