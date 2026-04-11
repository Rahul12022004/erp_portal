import mongoose from "mongoose";

const transportSchema = new mongoose.Schema(
  {
    busNumber: { type: String, required: true },
    routeName: { type: String, required: true },
    driverName: { type: String, required: true },
    driverPhone: { type: String, required: true },
    driverLicenseNumber: { type: String, required: true },
    driverLicensePhoto: String,
    rcDocument: String,
    rcExpiryDate: String,
    pollutionDocument: String,
    pollutionExpiryDate: String,
    insuranceDocument: String,
    insuranceExpiryDate: String,
    fitnessCertificateDocument: String,
    fitnessExpiryDate: String,
    conductorName: { type: String, required: true },
    conductorPhone: String,
    conductorInfo: String,
    routeStops: [{ type: String }],
    readingLogs: [
      {
        readingDate: { type: Date, default: Date.now },
        driverName: { type: String, required: true },
        odometerReading: { type: Number, required: true },
        previousReading: { type: Number },
        distanceKm: { type: Number },
        fuelAmount: { type: Number },
        fuelSlip: { type: String },
        fuelSlipFileName: { type: String },
      },
    ],
    assignedStudents: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Student" }
    ],
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

transportSchema.index({ schoolId: 1, busNumber: 1 });

export default mongoose.model("Transport", transportSchema);
