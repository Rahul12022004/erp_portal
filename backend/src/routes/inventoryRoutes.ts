import express from "express";
import InventoryItem from "../models/InventoryItem";
import { createLog } from "../utils/createLog";

const router = express.Router();

// ==========================
// 📦 GET INVENTORY ITEMS FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const items = await InventoryItem.find({ schoolId: req.params.schoolId })
      .sort({ category: 1, name: 1 });

    res.json(items);
  } catch (error) {
    console.error("GET INVENTORY ERROR:", error);
    res.status(500).json({ message: "Failed to fetch inventory items" });
  }
});

// ==========================
// ➕ CREATE INVENTORY ITEM
// ==========================
router.post("/", async (req, res) => {
  try {
    const { name, category, quantity, location, description, schoolId } = req.body;

    if (!name || !category || quantity === undefined || !schoolId) {
      return res.status(400).json({
        message: "Required fields: name, category, quantity, schoolId",
      });
    }

    const item = await InventoryItem.create({
      name,
      category,
      quantity,
      location,
      description,
      schoolId,
    });

    await createLog({
      action: "CREATE_INVENTORY_ITEM",
      message: `Inventory item created: ${name}`,
      schoolId,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error("CREATE INVENTORY ERROR:", error);
    res.status(500).json({ message: "Failed to create inventory item" });
  }
});

// ==========================
// ✏️ UPDATE INVENTORY ITEM
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    await createLog({
      action: "UPDATE_INVENTORY_ITEM",
      message: `Inventory item updated: ${item.name}`,
      schoolId: item.schoolId,
    });

    res.json({ success: true, data: item });
  } catch (error) {
    console.error("UPDATE INVENTORY ERROR:", error);
    res.status(500).json({ message: "Failed to update inventory item" });
  }
});

// ==========================
// 🗑 DELETE INVENTORY ITEM
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    await createLog({
      action: "DELETE_INVENTORY_ITEM",
      message: `Inventory item deleted: ${item.name}`,
      schoolId: item.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE INVENTORY ERROR:", error);
    res.status(500).json({ message: "Failed to delete inventory item" });
  }
});

export default router;
