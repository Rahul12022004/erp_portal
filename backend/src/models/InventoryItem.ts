import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    itemCode: { type: String, required: true },
    category: { type: String, required: true },
    subcategory: { type: String, default: "" },
    unitType: { type: String, default: "pcs" },
    stockCount: { type: Number, required: true, min: 0 },
    minStockLevel: { type: Number, required: true, min: 0, default: 0 },
    condition: {
      type: String,
      enum: ["new", "good", "fair", "damaged"],
      default: "good",
    },
    supplier: { type: String, default: "" },
    purchaseDate: { type: String, default: "" },
    location: {
      building: { type: String, default: "" },
      room: { type: String, default: "" },
      rack: { type: String, default: "" },
      shelf: { type: String, default: "" },
    },
    description: String,
    activityHistory: [
      {
        actionType: {
          type: String,
          enum: [
            "created",
            "updated",
            "add_stock",
            "issue_item",
            "return_item",
            "mark_damaged",
            "transfer_location",
          ],
          required: true,
        },
        quantityChange: { type: Number, default: 0 },
        previousStock: { type: Number, default: 0 },
        newStock: { type: Number, default: 0 },
        note: { type: String, default: "" },
        actionDate: { type: Date, default: Date.now },
        locationSnapshot: {
          building: { type: String, default: "" },
          room: { type: String, default: "" },
          rack: { type: String, default: "" },
          shelf: { type: String, default: "" },
        },
      },
    ],
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ schoolId: 1, category: 1, name: 1 });
inventoryItemSchema.index({ schoolId: 1, itemCode: 1 }, { unique: true });

export default mongoose.model("InventoryItem", inventoryItemSchema);
