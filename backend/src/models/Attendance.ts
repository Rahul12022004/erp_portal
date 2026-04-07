import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    status: { type: String, enum: ["Present", "Absent", "Leave", "Half Day"], required: true },
    remarks: String,
    selfMarked: { type: Boolean, default: false },
    selfLocked: { type: Boolean, default: false },
    selfLockedAt: Date,
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      capturedAt: Date,
    },
    isOutsideSchool: { type: Boolean, default: false },
    distanceFromSchoolMeters: Number,
  },
  { timestamps: true }
);

attendanceSchema.pre("validate", function (this: any) {
  const hasStaffId = Boolean(this.staffId);
  const hasStudentId = Boolean(this.studentId);

  if (hasStaffId === hasStudentId) {
    throw new Error("Exactly one of staffId or studentId is required");
  }
});

export default mongoose.model("Attendance", attendanceSchema);
