import mongoose from "mongoose";

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    assignedStudents: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Student" }
    ],
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

hostelSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export default mongoose.model("Hostel", hostelSchema);
