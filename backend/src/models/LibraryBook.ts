import mongoose from "mongoose";

const libraryBookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

libraryBookSchema.index({ schoolId: 1, title: 1 });

export default mongoose.model("LibraryBook", libraryBookSchema);
