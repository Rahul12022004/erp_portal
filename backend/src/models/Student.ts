import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    formNumber: String,
    formDate: String,
    admissionNumber: String,
    registration_no: { type: String, trim: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    class: { type: String, required: true }, // e.g., "Class 1", "Grade 10A"
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", default: null },
    classSection: String,
    section_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    academicYear: String,
    academic_year: { type: String, trim: true },
    rollNumber: { type: String, required: true },
    roll_no: { type: String, trim: true },
    phone: String,
    mobile_number: { type: String, trim: true },
    father_name: { type: String, trim: true },
    mother_name: { type: String, trim: true },
    fatherPhone: { type: String, trim: true },
    motherPhone: { type: String, trim: true },
    fatherEmail: { type: String, trim: true },
    motherEmail: { type: String, trim: true },
    fatherAadharNumber: { type: String, trim: true },
    motherAadharNumber: { type: String, trim: true },
    fatherAadharCardDocument: String,
    motherAadharCardDocument: String,
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
    transport_status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "NO_TRANSPORT"],
      default: "NO_TRANSPORT",
    },
    transport_route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transport",
      default: null,
    },
    busConsent: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Transferred", "Left", "Suspended"],
      default: "Active",
    },
    photo: String,
    rteDocument: String,
    bodCertificate: String,
    aadharCardDocument: String,
    admissionCompleted: { type: Boolean, default: false },
    house: { type: String, enum: ["Ruby", "Emerald", "Safier", "Topaz"], default: undefined },
  },
  { timestamps: true }
);

studentSchema.index({ schoolId: 1, class_id: 1, section_id: 1, academic_year: 1, status: 1 });
studentSchema.index({ schoolId: 1, transport_status: 1, transport_route_id: 1 });
studentSchema.index({ schoolId: 1, class_id: 1, name: 1 });
studentSchema.index({ schoolId: 1, rollNumber: 1 });
studentSchema.index({ schoolId: 1, roll_no: 1 });

export default mongoose.model("Student", studentSchema);
