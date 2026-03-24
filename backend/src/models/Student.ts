import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    class: { type: String, required: true }, // e.g., "Class 1", "Grade 10A"
    rollNumber: { type: String, required: true },
    phone: String,
    address: String,
    dateOfBirth: String,
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Student", studentSchema);