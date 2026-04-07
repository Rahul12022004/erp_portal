import express from "express";
import InventoryItem from "../models/InventoryItem";
import { createLog } from "../utils/createLog";

const router = express.Router();

type InventoryLocation = {
  building?: string;
  room?: string;
  rack?: string;
  shelf?: string;
};

type InventoryHistoryEntry = {
  actionType:
    | "created"
    | "updated"
    | "add_stock"
    | "issue_item"
    | "return_item"
    | "mark_damaged"
    | "transfer_location";
  quantityChange: number;
  previousStock: number;
  newStock: number;
  note?: string;
  actionDate?: Date;
  locationSnapshot?: InventoryLocation;
};

type InventoryItemRecord = {
  _id: string;
  name: string;
  schoolId: string;
  category: string;
  itemCode: string;
  subcategory?: string;
  supplier?: string;
  condition?: string;
  quantity?: number;
  stockCount?: number;
  minStockLevel?: number;
  location?: InventoryLocation;
  activityHistory?: InventoryHistoryEntry[];
  toObject: () => Record<string, unknown>;
  save: () => Promise<unknown>;
};

type InventoryActionResult =
  | { ok: true; item: InventoryItemRecord }
  | { ok: false; message: string; status: number };

type MongoLikeError = {
  code?: number;
};

const normalizeLocation = (location: unknown): InventoryLocation => {
  const record = (location && typeof location === "object" ? location : {}) as Record<string, unknown>;
  return {
    building: String(record.building || "").trim(),
    room: String(record.room || "").trim(),
    rack: String(record.rack || "").trim(),
    shelf: String(record.shelf || "").trim(),
  };
};

const toNumber = (value: unknown): number => Number(value || 0);

const getItemStockCount = (item: InventoryItemRecord): number => {
  if (item.stockCount !== undefined && item.stockCount !== null) {
    return Number(item.stockCount || 0);
  }
  return Number(item.quantity || 0);
};

const getStockStatus = (item: InventoryItemRecord): "in_stock" | "low_stock" | "out_of_stock" => {
  const stock = getItemStockCount(item);
  const min = Number(item.minStockLevel || 0);

  if (stock <= 0) return "out_of_stock";
  if (stock <= min) return "low_stock";
  return "in_stock";
};

const appendHistory = (item: InventoryItemRecord, historyEntry: InventoryHistoryEntry) => {
  const currentHistory = Array.isArray(item.activityHistory) ? item.activityHistory : [];
  item.activityHistory = [...currentHistory, historyEntry];
};

const serializeItem = (item: InventoryItemRecord) => {
  const plain = item.toObject();
  return {
    ...plain,
    stockCount: getItemStockCount(item),
    stockStatus: getStockStatus(item),
  };
};

const asInventoryItemRecord = (value: unknown): InventoryItemRecord =>
  value as InventoryItemRecord;

// ==========================
// 📦 GET INVENTORY ITEMS FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { search = "", category = "", status = "", condition = "" } = req.query;

    const filter: Record<string, unknown> = { schoolId };

    if (category) {
      filter.category = String(category);
    }

    if (condition) {
      filter.condition = String(condition);
    }

    if (search) {
      const term = String(search);
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { itemCode: { $regex: term, $options: "i" } },
        { category: { $regex: term, $options: "i" } },
        { subcategory: { $regex: term, $options: "i" } },
        { supplier: { $regex: term, $options: "i" } },
      ];
    }

    const rawItems = await InventoryItem.find(filter).sort({ category: 1, name: 1 });
    const allItems = rawItems.map((item) => serializeItem(asInventoryItemRecord(item)));

    const filteredByStatus = status
      ? allItems.filter((item) => item.stockStatus === String(status))
      : allItems;

    const stats = {
      totalItems: filteredByStatus.length,
      totalStockUnits: filteredByStatus.reduce((sum, item) => sum + Number(item.stockCount || 0), 0),
      lowStockItems: filteredByStatus.filter((item) => item.stockStatus === "low_stock").length,
      outOfStockItems: filteredByStatus.filter((item) => item.stockStatus === "out_of_stock").length,
    };

    res.json({
      success: true,
      stats,
      alerts: {
        lowStock: filteredByStatus.filter((item) => item.stockStatus === "low_stock"),
        outOfStock: filteredByStatus.filter((item) => item.stockStatus === "out_of_stock"),
      },
      items: filteredByStatus,
    });
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
    const {
      name,
      itemCode,
      category,
      subcategory,
      unitType,
      stockCount,
      minStockLevel,
      condition,
      supplier,
      purchaseDate,
      location,
      description,
      schoolId,
    } = req.body;

    if (!name || !itemCode || !category || stockCount === undefined || minStockLevel === undefined || !schoolId) {
      return res.status(400).json({
        message: "Required fields: name, itemCode, category, stockCount, minStockLevel, schoolId",
      });
    }

    const parsedStock = toNumber(stockCount);
    const parsedMinStock = toNumber(minStockLevel);

    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ message: "Stock count must be a valid number >= 0" });
    }

    if (!Number.isFinite(parsedMinStock) || parsedMinStock < 0) {
      return res.status(400).json({ message: "Minimum stock must be a valid number >= 0" });
    }

    const normalizedLocation = normalizeLocation(location);

    const created = await InventoryItem.create({
      name: String(name).trim(),
      itemCode: String(itemCode).trim(),
      category: String(category).trim(),
      subcategory: String(subcategory || "").trim(),
      unitType: String(unitType || "pcs").trim(),
      stockCount: parsedStock,
      minStockLevel: parsedMinStock,
      condition: condition || "good",
      supplier: String(supplier || "").trim(),
      purchaseDate: String(purchaseDate || "").trim(),
      location: normalizedLocation,
      description: String(description || "").trim(),
      schoolId,
      activityHistory: [
        {
          actionType: "created",
          quantityChange: parsedStock,
          previousStock: 0,
          newStock: parsedStock,
          note: "Item created",
          locationSnapshot: normalizedLocation,
        },
      ],
    });

    const item = asInventoryItemRecord(created);

    await createLog({
      action: "CREATE_INVENTORY_ITEM",
      message: `Inventory item created: ${item.name} (${item.itemCode})`,
      schoolId,
    });

    res.status(201).json({ success: true, data: serializeItem(item) });
  } catch (error) {
    console.error("CREATE INVENTORY ERROR:", error);
    const typedError = error as MongoLikeError;
    if (typedError.code === 11000) {
      return res.status(409).json({ message: "Item code already exists for this school" });
    }
    res.status(500).json({ message: "Failed to create inventory item" });
  }
});

// ==========================
// ✏️ UPDATE INVENTORY ITEM
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const updates = { ...req.body } as Record<string, unknown>;

    if (updates.location) {
      updates.location = normalizeLocation(updates.location);
    }

    if (updates.stockCount !== undefined) {
      updates.stockCount = toNumber(updates.stockCount);
    }

    if (updates.minStockLevel !== undefined) {
      updates.minStockLevel = toNumber(updates.minStockLevel);
    }

    const found = await InventoryItem.findById(req.params.id);

    if (!found) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const item = asInventoryItemRecord(found);
    const previousStock = getItemStockCount(item);

    Object.assign(item, updates);

    appendHistory(item, {
      actionType: "updated",
      quantityChange: getItemStockCount(item) - previousStock,
      previousStock,
      newStock: getItemStockCount(item),
      note: "Item details updated",
      locationSnapshot: normalizeLocation(item.location),
    });

    await item.save();

    await createLog({
      action: "UPDATE_INVENTORY_ITEM",
      message: `Inventory item updated: ${item.name}`,
      schoolId: item.schoolId,
    });

    res.json({ success: true, data: serializeItem(item) });
  } catch (error) {
    console.error("UPDATE INVENTORY ERROR:", error);
    res.status(500).json({ message: "Failed to update inventory item" });
  }
});

const applyStockAction = async (
  itemId: string,
  actionType: "add_stock" | "issue_item" | "return_item" | "mark_damaged",
  quantity: number,
  note: string
): Promise<InventoryActionResult> => {
  const found = await InventoryItem.findById(itemId);
  if (!found) return { ok: false, message: "Inventory item not found", status: 404 };

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, message: "Quantity must be greater than 0", status: 400 };
  }

  const item = asInventoryItemRecord(found);
  const previousStock = getItemStockCount(item);
  let newStock = previousStock;

  if (actionType === "add_stock" || actionType === "return_item") {
    newStock = previousStock + quantity;
  }

  if (actionType === "issue_item" || actionType === "mark_damaged") {
    if (quantity > previousStock) {
      return { ok: false, message: "Not enough stock available", status: 400 };
    }
    newStock = previousStock - quantity;
  }

  item.stockCount = newStock;

  appendHistory(item, {
    actionType,
    quantityChange: actionType === "issue_item" || actionType === "mark_damaged" ? -quantity : quantity,
    previousStock,
    newStock,
    note: String(note || "").trim(),
    locationSnapshot: normalizeLocation(item.location),
  });

  await item.save();

  return { ok: true, item };
};

router.post("/:id/add-stock", async (req, res) => {
  try {
    const result = await applyStockAction(req.params.id, "add_stock", toNumber(req.body.quantity), req.body.note || "");
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    await createLog({
      action: "ADD_INVENTORY_STOCK",
      message: `Stock added for ${result.item.name}: +${toNumber(req.body.quantity)}`,
      schoolId: result.item.schoolId,
    });

    res.json({ success: true, data: serializeItem(result.item) });
  } catch (error) {
    console.error("ADD STOCK ERROR:", error);
    res.status(500).json({ message: "Failed to add stock" });
  }
});

router.post("/:id/issue-item", async (req, res) => {
  try {
    const result = await applyStockAction(req.params.id, "issue_item", toNumber(req.body.quantity), req.body.note || "");
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    await createLog({
      action: "ISSUE_INVENTORY_ITEM",
      message: `Item issued ${result.item.name}: -${toNumber(req.body.quantity)}`,
      schoolId: result.item.schoolId,
    });

    res.json({ success: true, data: serializeItem(result.item) });
  } catch (error) {
    console.error("ISSUE ITEM ERROR:", error);
    res.status(500).json({ message: "Failed to issue item" });
  }
});

router.post("/:id/return-item", async (req, res) => {
  try {
    const result = await applyStockAction(req.params.id, "return_item", toNumber(req.body.quantity), req.body.note || "");
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    await createLog({
      action: "RETURN_INVENTORY_ITEM",
      message: `Item returned ${result.item.name}: +${toNumber(req.body.quantity)}`,
      schoolId: result.item.schoolId,
    });

    res.json({ success: true, data: serializeItem(result.item) });
  } catch (error) {
    console.error("RETURN ITEM ERROR:", error);
    res.status(500).json({ message: "Failed to return item" });
  }
});

router.post("/:id/mark-damaged", async (req, res) => {
  try {
    const result = await applyStockAction(req.params.id, "mark_damaged", toNumber(req.body.quantity), req.body.note || "");
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    await createLog({
      action: "DAMAGED_INVENTORY_ITEM",
      message: `Item marked damaged ${result.item.name}: -${toNumber(req.body.quantity)}`,
      schoolId: result.item.schoolId,
    });

    res.json({ success: true, data: serializeItem(result.item) });
  } catch (error) {
    console.error("MARK DAMAGED ERROR:", error);
    res.status(500).json({ message: "Failed to mark damaged item" });
  }
});

router.post("/:id/transfer-location", async (req, res) => {
  try {
    const found = await InventoryItem.findById(req.params.id);
    if (!found) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const item = asInventoryItemRecord(found);
    const previousStock = getItemStockCount(item);
    const location = normalizeLocation(req.body.location);

    item.location = location;

    appendHistory(item, {
      actionType: "transfer_location",
      quantityChange: 0,
      previousStock,
      newStock: previousStock,
      note: String(req.body.note || "Location transferred").trim(),
      locationSnapshot: location,
    });

    await item.save();

    await createLog({
      action: "TRANSFER_INVENTORY_LOCATION",
      message: `Location transferred for ${item.name}`,
      schoolId: item.schoolId,
    });

    res.json({ success: true, data: serializeItem(item) });
  } catch (error) {
    console.error("TRANSFER LOCATION ERROR:", error);
    res.status(500).json({ message: "Failed to transfer location" });
  }
});

// ==========================
// 🗑 DELETE INVENTORY ITEM
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const found = await InventoryItem.findByIdAndDelete(req.params.id);

    if (!found) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const item = asInventoryItemRecord(found);

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
