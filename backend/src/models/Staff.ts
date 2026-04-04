import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, select: false },
    phone: { type: String, required: true },
    position: { type: String, required: true }, // e.g., "Teacher", "Principal", "HOD", "Librarian"
    department: String, // e.g., "Science", "Arts", "Math"
    qualification: String,
    address: String,
    dateOfBirth: String,
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    joinDate: String,
    status: { type: String, enum: ["Active", "Inactive", "On Leave"], default: "Active" },
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    ossId: String,             // CBSE OSS ID (teachers)
    workHistoryDoc: String,   // base64 — past working history document
    offerLetterDoc: String,   // base64 — previous school offer letter (teachers)
    identityDoc: String,      // base64 — Aadhaar / identity proof
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Staff", staffSchema);