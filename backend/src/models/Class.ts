import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Class 10A"
    section: { type: String }, // e.g., "A", "B", "C"
    stream: { type: String }, // e.g., "Science", "Commerce", "Arts"
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" }, // Class teacher reference
    studentCount: { type: Number, default: 0 },
    academicYear: { type: String }, // e.g., "2024-2025"
    description: String,
    meetLink: String, // Google Meet link
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Class", classSchema);
