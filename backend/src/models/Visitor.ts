import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    passId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    regDate: { type: String, default: "" },
    requestMode: { type: String, default: "" },
    passStatus: {
      type: String,
      enum: ["Approved", "Pending", "Rejected"],
      default: "Pending",
    },
    fullName: { type: String, default: "" },
    photo: { type: String, default: "" },
    idType: { type: String, default: "" },
    idNumber: { type: String, default: "" },
    idProof: { type: String, default: "" },
    idProofFileName: { type: String, default: "" },
    mobile: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    visitDate: { type: String, default: "" },
    entryTime: { type: String, default: "" },
    exitTime: { type: String, default: "" },
    visitType: { type: String, default: "" },
    purpose: { type: String, default: "" },
    personToMeetType: { type: String, default: "" },
    personToMeet: { type: String, default: "" },
    department: { type: String, default: "" },
    studentClass: { type: String, default: "" },
    studentName: { type: String, default: "" },
    approvalStatus: {
      type: String,
      enum: ["Approved", "Pending", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Visitor", visitorSchema);
