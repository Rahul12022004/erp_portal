import mongoose from "mongoose";

const socialMediaSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["whatsapp", "instagram", "facebook", "linkedin"],
      required: true,
    },
    accountName: { type: String, required: true },
    profileUrl: String,
    phoneNumber: String,
    bio: String,
    isActive: { type: Boolean, default: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

socialMediaSchema.index({ schoolId: 1, platform: 1, accountName: 1 });

export default mongoose.model("SocialMedia", socialMediaSchema);
