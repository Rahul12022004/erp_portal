import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    location: String,
    description: String,
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ schoolId: 1, category: 1, name: 1 });

export default mongoose.model("InventoryItem", inventoryItemSchema);
