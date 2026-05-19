import mongoose from "mongoose";

const libraryBookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    accessionNumber: { type: String, required: true },
    isbn: { type: String, default: "" },
    publisher: { type: String, default: "" },
    edition: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    availableCopies: { type: Number, required: true, min: 0 },
    rack: { type: String, required: true },
    shelf: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "out_of_stock", "archived"],
      default: "active",
    },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

libraryBookSchema.index({ schoolId: 1, title: 1 });
libraryBookSchema.index({ schoolId: 1, accessionNumber: 1 }, { unique: true });

export default mongoose.model("LibraryBook", libraryBookSchema);
