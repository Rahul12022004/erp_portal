import mongoose from "mongoose";

const teacherRoleAssignmentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    roleName: { type: String, required: true, trim: true },
    modules: { type: [String], default: [] },
    generatedPassword: { type: String, required: true },
    teacherEmail: { type: String, required: true, trim: true },
    createdBy: { type: String, default: "School Admin" },
  },
  { timestamps: true }
);

teacherRoleAssignmentSchema.index({ schoolId: 1, teacherId: 1, roleName: 1 }, { unique: true });

export default mongoose.model("TeacherRoleAssignment", teacherRoleAssignmentSchema);
