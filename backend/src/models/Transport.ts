import mongoose from "mongoose";

const transportSchema = new mongoose.Schema(
  {
    busNumber: { type: String, required: true },
    routeName: { type: String, required: true },
    driverName: { type: String, required: true },
    conductorName: { type: String, required: true },
    pickupTime: String,
    dropTime: String,
    assignedStudents: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Student" }
    ],
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

transportSchema.index({ schoolId: 1, busNumber: 1 });

export default mongoose.model("Transport", transportSchema);
