import mongoose from "mongoose";

const dataImportBatchSchema = new mongoose.Schema(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    module_type: {
      type: String,
      required: true,
      enum: ["student-master", "class-fee", "student-fee-record", "transport", "ledger", "summary-fee"],
    },
    source_file_name: { type: String, required: true, trim: true },
    sheet_name: { type: String, required: true, trim: true },
    academic_year: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ["VALIDATED", "IMPORTED", "ROLLED_BACK", "IMPORT_FAILED"],
      default: "VALIDATED",
      index: true,
    },
    mapping: { type: mongoose.Schema.Types.Mixed, default: {} },
    summary: {
      total_rows: { type: Number, default: 0 },
      valid_rows: { type: Number, default: 0 },
      invalid_rows: { type: Number, default: 0 },
      duplicate_rows: { type: Number, default: 0 },
      imported_students: { type: Number, default: 0 },
      imported_fee_accounts: { type: Number, default: 0 },
      imported_fee_structures: { type: Number, default: 0 },
      imported_transports: { type: Number, default: 0 },
      updated_students: { type: Number, default: 0 },
      updated_fee_accounts: { type: Number, default: 0 },
      failed_rows: { type: Number, default: 0 },
    },
    errors: [
      {
        row_number: Number,
        messages: [String],
      },
    ],
    duplicate_rows: [
      {
        row_number: Number,
        reason: String,
      },
    ],
    normalized_rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
    inserted_refs: {
      students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
      fee_assignments: [{ type: mongoose.Schema.Types.ObjectId, ref: "StudentFeeAssignment" }],
      fee_structures: [{ type: mongoose.Schema.Types.ObjectId, ref: "ClassFeeStructure" }],
      transports: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transport" }],
    },
    rolled_back_at: { type: Date, default: null },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

dataImportBatchSchema.index({ school_id: 1, created_at: -1 });

export default mongoose.model("DataImportBatch", dataImportBatchSchema);
