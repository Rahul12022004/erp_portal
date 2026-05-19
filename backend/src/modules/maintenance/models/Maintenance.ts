import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    workDone: { type: String, required: true, trim: true },
    raisedBy: { type: String, required: true, trim: true },
    technician: { type: String, required: true, trim: true },
    maintenanceDate: { type: String, required: true },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Maintenance", maintenanceSchema);
