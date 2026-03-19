import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema(
  {
    schoolInfo: {
      name: { type: String, required: true },
      email: String,
      phone: String,
      website: String,
      address: String,
      logo: String,
    },

    adminInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      password: { type: String, required: true },
      phone: String,
    },

    systemInfo: {
      schoolType: String,
      maxStudents: Number,
      subscriptionPlan: String,
    },

    modules: [String],
  },
  { timestamps: true }
);

export default mongoose.model("School", schoolSchema);