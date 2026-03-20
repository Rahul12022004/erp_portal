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
      name: String,
      email: String,
      password: String,
      phone: String,
      status: {
        type: String,
        default: "Active",
      },
    },

    systemInfo: {
      schoolType: String,
      maxStudents: Number,
      subscriptionPlan: String,
      subscriptionEndDate: String, 
      
    },

    modules: [String],
  },
  { timestamps: true }
);

export default mongoose.model("School", schoolSchema);