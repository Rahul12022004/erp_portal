import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    position: { type: String, required: true }, // e.g., "Teacher", "Principal", "HOD", "Librarian"
    department: String, // e.g., "Science", "Arts", "Math"
    qualification: String,
    address: String,
    dateOfBirth: String,
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    joinDate: String,
    status: { type: String, enum: ["Active", "Inactive", "On Leave"], default: "Active" },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Staff", staffSchema);