import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    vendorCode: {
      type: String,
      unique: true,
      trim: true,
    },
    serviceType: [String], // e.g., ["Maintenance", "Supplies", "Repairs"]

    // Contact Information
    contactPerson: String,
    contactNumber: {
      type: String,
      required: true,
    },
    alternateContactNumber: String,
    email: {
      type: String,
      required: true,
      index: true,
    },
    website: String,

    // Address
    address: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,

    // Tax & Compliance
    gstNumber: String,
    panNumber: String,
    taxIdentificationNumber: String,
    bankAccountNumber: String,
    bankName: String,
    ifscCode: String,

    // Financial Tracking
    totalSpent: {
      type: Number,
      default: 0,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
    },
    paymentTerms: String,
    creditLimit: Number,

    // Payment History
    paymentHistory: [
      {
        expenseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Expense",
        },
        amount: Number,
        paymentDate: Date,
        paymentMode: String,
        referenceNumber: String,
      },
    ],

    // Ratings & Performance
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    performanceNotes: String,

    // Status & Management
    status: {
      type: String,
      enum: ["active", "inactive", "blacklisted", "archived"],
      default: "active",
      index: true,
    },
    isBlacklisted: {
      type: Boolean,
      default: false,
    },
    blacklistReason: String,

    // School & Organization
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
  },
  { timestamps: true }
);

// Indexes
vendorSchema.index({ schoolId: 1, status: 1 });
vendorSchema.index({ schoolId: 1, name: 1 });
vendorSchema.index({ gstNumber: 1 });

export default mongoose.model("Vendor", vendorSchema);
