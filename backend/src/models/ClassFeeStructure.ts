import mongoose from "mongoose";

const classFeeStructureSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    class_id: { type: String, required: true, trim: true },
    section_id: { type: String, default: null },
    academic_year: { type: String, required: true, trim: true },
    academic_fee: { type: Number, required: true, default: 0, min: 0 },
    default_transport_fee: { type: Number, required: true, default: 0, min: 0 },
    other_fee: { type: Number, required: true, default: 0, min: 0 },
    fee_breakdown: {
      type: [{ label: { type: String, trim: true }, amount: { type: Number, min: 0 }, _id: false }],
      default: [],
    },
    due_date: { type: String, required: true, trim: true },
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
    late_fee_type: {
      type: String,
      enum: ["none", "fixed", "daily", "percentage"],
      default: "none",
    },
    late_fee_amount: { type: Number, default: 0, min: 0 },
    late_fee_description: { type: String, default: "" },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

classFeeStructureSchema.index(
  { school_id: 1, class_id: 1, section_id: 1, academic_year: 1 },
  { unique: true }
);
classFeeStructureSchema.index({ school_id: 1, is_active: 1, academic_year: 1 });

export default mongoose.model("ClassFeeStructure", classFeeStructureSchema);

