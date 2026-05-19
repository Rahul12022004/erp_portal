import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  { name: { type: String, required: true }, url: { type: String, required: true } },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    studentId:    { type: mongoose.Schema.Types.ObjectId, ref: "Student",    required: true },
    schoolId:     { type: mongoose.Schema.Types.ObjectId, ref: "School",     required: true },
    content:      { type: String, default: "" },
    attachments:  { type: [attachmentSchema], default: [] },
    status:       { type: String, enum: ["SUBMITTED", "GRADED", "RETURNED"], default: "SUBMITTED" },
    submittedAt:  { type: Date, default: () => new Date() },
    gradePoints:  { type: Number, default: null },
    gradeComment: { type: String, default: "" },
    gradedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    gradedAt:     { type: Date },
  },
  { timestamps: true, collection: "assignment_submissions" }
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ assignmentId: 1 });
submissionSchema.index({ studentId: 1, schoolId: 1 });

export default mongoose.model("AssignmentSubmission", submissionSchema);
