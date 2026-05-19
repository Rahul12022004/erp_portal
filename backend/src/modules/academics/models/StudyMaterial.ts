import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    schoolId:    { type: mongoose.Schema.Types.ObjectId, ref: "School",  required: true },
    classId:     { type: mongoose.Schema.Types.ObjectId, ref: "Class",   required: true },
    subjectId:   { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
    teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "Staff",   required: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type:        { type: String, enum: ["FILE", "LINK", "VIDEO", "DOCUMENT", "OTHER"], default: "FILE" },
    url:         { type: String, default: "" },
    fileName:    { type: String, default: "" },
    fileData:    { type: String, default: "" }, // base64 for small files
  },
  { timestamps: true, collection: "study_materials" }
);

materialSchema.index({ schoolId: 1, classId: 1 });
materialSchema.index({ schoolId: 1, classId: 1, subjectId: 1 });

export default mongoose.model("StudyMaterial", materialSchema);
