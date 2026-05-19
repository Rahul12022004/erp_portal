import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    schoolId:    { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    classId:     { type: mongoose.Schema.Types.ObjectId, ref: "Class",  required: true },
    name:        { type: String, required: true, trim: true },   // "Mathematics"
    code:        { type: String, default: "", trim: true },       // "MATH10A"
    description: { type: String, default: "" },
    teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true, collection: "subjects" }
);

subjectSchema.index({ schoolId: 1, classId: 1 });
subjectSchema.index({ schoolId: 1, classId: 1, name: 1 }, { unique: true });

export default mongoose.model("Subject", subjectSchema);
