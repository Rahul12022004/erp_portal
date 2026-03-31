import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    formNumber: String,
    formDate: String,
    admissionNumber: String,
    name: { type: String, required: true },
    email: { type: String, required: true },
    class: { type: String, required: true }, // e.g., "Class 1", "Grade 10A"
    classSection: String,
    academicYear: String,
    rollNumber: { type: String, required: true },
    phone: String,
    aadharNumber: String,
    address: String,
    pinCode: String,
    dateOfBirth: String,
    placeOfBirth: String,
    state: String,
    nationality: String,
    religion: String,
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    caste: String,
    motherTongue: String,
    bloodGroup: String,
    identificationMarks: String,
    previousAcademicRecord: String,
    achievements: String,
    generalBehaviour: String,
    medicalHistory: String,
    languagePreferences: [String],
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    hasParentConsent: { type: Boolean, default: false },
    needsTransport: { type: Boolean, default: false },
    busConsent: { type: Boolean, default: false },
    photo: String,
    house: { type: String, enum: ["Ruby", "Emerald", "Safier", "Topaz"], default: undefined },
  },
  { timestamps: true }
);

export default mongoose.model("Student", studentSchema);
