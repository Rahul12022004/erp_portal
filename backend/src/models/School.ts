import mongoose from "mongoose";

const feeComponentSchema = new mongoose.Schema(
  {
    label: String,
    amount: Number,
  },
  { _id: false }
);

const feeStructureSchema = new mongoose.Schema(
  {
    className: { type: String, required: true },
    amount: { type: Number, default: 0 },
    transportFee: { type: Number, default: 0 },
    academicYear: String,
    dueDate: String,
    feeComponents: { type: [feeComponentSchema], default: [] },
  },
  { _id: false }
);

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
      image: String,
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
    feeStructures: { type: [feeStructureSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("School", schoolSchema);
