import mongoose from "mongoose";

const libraryAssignmentSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "LibraryBook", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    assignDate: { type: String, required: true },
    returnDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["assigned", "returned"],
      default: "assigned",
    },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

libraryAssignmentSchema.index({ schoolId: 1, status: 1 });
libraryAssignmentSchema.index({ bookId: 1, studentId: 1, status: 1 });

export default mongoose.model("LibraryAssignment", libraryAssignmentSchema);
