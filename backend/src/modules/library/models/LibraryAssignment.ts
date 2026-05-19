import mongoose from "mongoose";

const libraryAssignmentSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "LibraryBook", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    assignDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    returnDate: { type: String, default: "" },
    issueStatus: {
      type: String,
      enum: ["issued", "returned", "overdue"],
      default: "issued",
    },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

libraryAssignmentSchema.index({ schoolId: 1, issueStatus: 1 });
libraryAssignmentSchema.index({ bookId: 1, studentId: 1, issueStatus: 1 });

export default mongoose.model("LibraryAssignment", libraryAssignmentSchema);
