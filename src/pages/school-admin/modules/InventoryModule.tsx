import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Box,
  ClipboardList,
  MinusCircle,
  Package,
  PackageCheck,
  PackageMinus,
  Search,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import { API_URL } from "@/lib/api";

type InventoryLocation = {
  building?: string;
  room?: string;
  rack?: string;
  shelf?: string;
};

type InventoryHistory = {
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
  actionDate?: string;
  locationSnapshot?: InventoryLocation;
};

type InventoryItem = {
  _id: string;
  name: string;
  itemCode: string;
  category: string;
  subcategory?: string;
  unitType?: string;
  stockCount: number;
  minStockLevel: number;
  condition: "new" | "good" | "fair" | "damaged";
  supplier?: string;
  purchaseDate?: string;
  location: InventoryLocation;
  description?: string;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
  activityHistory?: InventoryHistory[];
};

type InventoryStats = {
  totalItems: number;
  totalStockUnits: number;
  lowStockItems: number;
  outOfStockItems: number;
};

type InventoryResponse = {
  success: boolean;
  stats: InventoryStats;
  alerts: {
    lowStock: InventoryItem[];
    outOfStock: InventoryItem[];
  };
  items: InventoryItem[];
};

type ItemForm = {
  name: string;
  itemCode: string;
  category: string;
  subcategory: string;
  unitType: string;
  stockCount: string;
  minStockLevel: string;
  condition: "new" | "good" | "fair" | "damaged";
  supplier: string;
  purchaseDate: string;
  building: string;
  room: string;
  rack: string;
  shelf: string;
  description: string;
};

type StockActionType = "add-stock" | "issue-item" | "return-item" | "mark-damaged" | "transfer-location";

const emptyForm: ItemForm = {
  name: "",
  itemCode: "",
  category: "",
  subcategory: "",
  unitType: "pcs",
  stockCount: "",
  minStockLevel: "",
  condition: "good",
  supplier: "",
  purchaseDate: "",
  building: "",
  room: "",
  rack: "",
  shelf: "",
  description: "",
};

const CATEGORY_OPTIONS = [
  "Stationery",
  "Lab Equipment",
  "Furniture",
  "Sports",
  "IT Equipment",
  "Electrical",
  "Cleaning",
  "Library",
  "Medical",
  "Other",
];

const UNIT_OPTIONS = ["pcs", "box", "set", "kg", "litre", "meter", "pack"];
const BUILDING_OPTIONS = ["Main Block", "Admin Block", "Science Block", "Sports Block", "Hostel Block"];
const ROOM_OPTIONS = ["Store Room 1", "Store Room 2", "Lab 1", "Lab 2", "Office 1", "Office 2"];
const RACK_OPTIONS = ["Rack A", "Rack B", "Rack C", "Rack D", "Rack E", "Rack F"];
const SHELF_OPTIONS = ["Shelf 1", "Shelf 2", "Shelf 3", "Shelf 4", "Shelf 5", "Shelf 6"];

const getStockStatus = (item: InventoryItem): "in_stock" | "low_stock" | "out_of_stock" => {
  if (item.stockStatus) return item.stockStatus;
  if (Number(item.stockCount || 0) <= 0) return "out_of_stock";
  if (Number(item.stockCount || 0) <= Number(item.minStockLevel || 0)) return "low_stock";
  return "in_stock";
};

const formatLocation = (location?: InventoryLocation) => {
  if (!location) return "-";
  const values = [location.building, location.room, location.rack, location.shelf].filter(Boolean);
  return values.length ? values.join(" / ") : "-";
};

export default function InventoryModule() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalStockUnits: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  });
  const [alerts, setAlerts] = useState<{ lowStock: InventoryItem[]; outOfStock: InventoryItem[] }>({
    lowStock: [],
    outOfStock: [],
  });

  const [formData, setFormData] = useState<ItemForm>(emptyForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<StockActionType>("add-stock");
  const [actionQuantity, setActionQuantity] = useState("1");
  const [actionNote, setActionNote] = useState("");
  const [transferBuilding, setTransferBuilding] = useState("");
  const [transferRoom, setTransferRoom] = useState("");
  const [transferRack, setTransferRack] = useState("");
  const [transferShelf, setTransferShelf] = useState("");

  const [historyItemId, setHistoryItemId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [performingAction, setPerformingAction] = useState(false);
  const [error, setError] = useState("");

  const school = useMemo(() => JSON.parse(localStorage.getItem("school") || "{}"), []);
  const schoolId = school?._id || "";

  const selectedActionItem = useMemo(
    () => items.find((item) => item._id === activeItemId) || null,
    [items, activeItemId]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const status = getStockStatus(item);
      const matchesSearch =
        !search.trim() ||
        `${item.name} ${item.itemCode} ${item.category} ${item.subcategory || ""} ${item.supplier || ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase());
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesStatus = !statusFilter || status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!schoolId) {
        setError("School not found. Please log in again.");
        setItems([]);
        return;
      }

      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (categoryFilter) query.set("category", categoryFilter);
      if (statusFilter) query.set("status", statusFilter);

      const qs = query.toString();
      const res = await fetch(`${API_URL}/api/inventory/${schoolId}${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        throw new Error(`Failed to load inventory (${res.status})`);
      }

      const data = (await res.json()) as InventoryResponse;
      const fetchedItems = Array.isArray(data.items) ? data.items : [];

      setItems(fetchedItems);
      setStats(
        data.stats || {
          totalItems: fetchedItems.length,
          totalStockUnits: fetchedItems.reduce((sum, item) => sum + Number(item.stockCount || 0), 0),
          lowStockItems: fetchedItems.filter((item) => getStockStatus(item) === "low_stock").length,
          outOfStockItems: fetchedItems.filter((item) => getStockStatus(item) === "out_of_stock").length,
        }
      );
      setAlerts({
        lowStock: data.alerts?.lowStock || [],
        outOfStock: data.alerts?.outOfStock || [],
      });
    } catch (err) {
      console.error("Inventory fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load inventory");
      setItems([]);
      setStats({ totalItems: 0, totalStockUnits: 0, lowStockItems: 0, outOfStockItems: 0 });
      setAlerts({ lowStock: [], outOfStock: [] });
    } finally {
      setLoading(false);
    }
  }, [schoolId, search, categoryFilter, statusFilter]);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingItemId(null);
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItemId(item._id);
    setFormData({
      name: item.name,
      itemCode: item.itemCode,
      category: item.category,
      subcategory: item.subcategory || "",
      unitType: item.unitType || "pcs",
      stockCount: String(item.stockCount),
      minStockLevel: String(item.minStockLevel || 0),
      condition: item.condition || "good",
      supplier: item.supplier || "",
      purchaseDate: item.purchaseDate || "",
      building: item.location?.building || "",
      room: item.location?.room || "",
      rack: item.location?.rack || "",
      shelf: item.location?.shelf || "",
      description: item.description || "",
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!schoolId) {
        setError("School not found. Please log in again.");
        return;
      }

      const stockCount = Number(formData.stockCount || 0);
      const minStockLevel = Number(formData.minStockLevel || 0);

      if (!Number.isFinite(stockCount) || stockCount < 0) {
        setError("Stock count must be a valid number >= 0.");
        return;
      }

      if (!Number.isFinite(minStockLevel) || minStockLevel < 0) {
        setError("Minimum stock level must be a valid number >= 0.");
        return;
      }

      const payload = {
        name: formData.name,
        itemCode: formData.itemCode,
        category: formData.category,
        subcategory: formData.subcategory,
        unitType: formData.unitType,
        stockCount,
        minStockLevel,
        condition: formData.condition,
        supplier: formData.supplier,
        purchaseDate: formData.purchaseDate,
        location: {
          building: formData.building,
          room: formData.room,
          rack: formData.rack,
          shelf: formData.shelf,
        },
        description: formData.description,
        schoolId,
      };

      const res = await fetch(
        editingItemId ? `${API_URL}/api/inventory/${editingItemId}` : `${API_URL}/api/inventory`,
        {
          method: editingItemId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save inventory item");
      }

      resetForm();
      await fetchInventory();
    } catch (err) {
      console.error("Inventory save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save inventory item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;

    try {
      const res = await fetch(`${API_URL}/api/inventory/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete inventory item");
      }

      if (editingItemId === id) resetForm();
      if (activeItemId === id) setActiveItemId(null);
      if (historyItemId === id) setHistoryItemId(null);

      await fetchInventory();
    } catch (err) {
      console.error("Inventory delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete inventory item");
    }
  };

  const openActionPanel = (item: InventoryItem, nextAction: StockActionType) => {
    setActiveItemId(item._id);
    setActionType(nextAction);
    setActionQuantity("1");
    setActionNote("");
    setTransferBuilding(item.location?.building || "");
    setTransferRoom(item.location?.room || "");
    setTransferRack(item.location?.rack || "");
    setTransferShelf(item.location?.shelf || "");
  };

  const performStockAction = async () => {
    if (!selectedActionItem) return;

    try {
      setPerformingAction(true);
      setError("");

      const actionMap: Record<StockActionType, string> = {
        "add-stock": "add-stock",
        "issue-item": "issue-item",
        "return-item": "return-item",
        "mark-damaged": "mark-damaged",
        "transfer-location": "transfer-location",
      };

      const endpoint = `${API_URL}/api/inventory/${selectedActionItem._id}/${actionMap[actionType]}`;
      const quantity = Number(actionQuantity || 0);

      const payload =
        actionType === "transfer-location"
          ? {
              location: {
                building: transferBuilding,
                room: transferRoom,
                rack: transferRack,
                shelf: transferShelf,
              },
              note: actionNote,
            }
          : {
              quantity,
              note: actionNote,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to perform action");
      }

      setActionNote("");
      setActionQuantity("1");
      await fetchInventory();
    } catch (err) {
      console.error("Inventory action error:", err);
      setError(err instanceof Error ? err.message : "Failed to perform inventory action");
    } finally {
      setPerformingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Items</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalItems}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Stock Units</p>
          <p className="mt-2 text-3xl font-semibold text-blue-700">{stats.totalStockUnits}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-700">Low Stock Alerts</p>
          <p className="mt-2 text-3xl font-semibold text-amber-700">{stats.lowStockItems}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-rose-700">Out of Stock</p>
          <p className="mt-2 text-3xl font-semibold text-rose-700">{stats.outOfStockItems}</p>
        </div>
      </div>

      {(alerts.lowStock.length > 0 || alerts.outOfStock.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-semibold">Low Stock Alert</p>
            </div>
            <div className="space-y-1 text-sm text-amber-800">
              {alerts.lowStock.slice(0, 5).map((item) => (
                <p key={item._id}>{item.name} ({item.itemCode}) - {item.stockCount} left</p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-rose-700">
              <ShieldAlert className="h-4 w-4" />
              <p className="text-sm font-semibold">Out of Stock Alert</p>
            </div>
            <div className="space-y-1 text-sm text-rose-800">
              {alerts.outOfStock.slice(0, 5).map((item) => (
                <p key={item._id}>{item.name} ({item.itemCode})</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-teal-600" />
          <h3 className="text-lg font-semibold text-slate-900">
            {editingItemId ? "Edit Inventory Item" : "Add Inventory Item"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              placeholder="Item Name"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Item Code"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.itemCode}
              onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
              required
            />
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              <option value="">Category</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Subcategory"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
            />

            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.unitType}
              onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
            >
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              placeholder="Stock Count"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.stockCount}
              onChange={(e) => setFormData({ ...formData, stockCount: e.target.value })}
              required
            />
            <input
              type="number"
              min="0"
              placeholder="Minimum Stock Level"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.minStockLevel}
              onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
              required
            />
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as ItemForm["condition"] })}
            >
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="damaged">Damaged</option>
            </select>

            <input
              type="text"
              placeholder="Supplier"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            />
            <input
              type="date"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            />

            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.building}
              onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              required
            >
              <option value="">Building</option>
              {BUILDING_OPTIONS.map((building) => (
                <option key={building} value={building}>{building}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              required
            >
              <option value="">Room</option>
              {ROOM_OPTIONS.map((room) => (
                <option key={room} value={room}>{room}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.rack}
              onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
              required
            >
              <option value="">Rack</option>
              {RACK_OPTIONS.map((rack) => (
                <option key={rack} value={rack}>{rack}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              value={formData.shelf}
              onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
              required
            >
              <option value="">Shelf</option>
              {SHELF_OPTIONS.map((shelf) => (
                <option key={shelf} value={shelf}>{shelf}</option>
              ))}
            </select>
          </div>

          <textarea
            placeholder="Description"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingItemId ? "Update Item" : "Add Item"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Inventory Items</h3>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search items..."
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading inventory...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-slate-500">No inventory items found.</p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Min</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const status = getStockStatus(item);

                    return (
                      <tr key={item._id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.subcategory || "-"}</p>
                        </td>
                        <td className="px-3 py-3 font-medium text-blue-700">{item.itemCode}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-3 py-3">{item.stockCount} {item.unitType || "pcs"}</td>
                        <td className="px-3 py-3">{item.minStockLevel}</td>
                        <td className="px-3 py-3">{formatLocation(item.location)}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              status === "in_stock"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "low_stock"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openActionPanel(item, "add-stock")}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
                              title="Add Stock"
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openActionPanel(item, "issue-item")}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700"
                              title="Issue Item"
                            >
                              <PackageMinus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openActionPanel(item, "return-item")}
                              className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs text-cyan-700"
                              title="Return Item"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openActionPanel(item, "mark-damaged")}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700"
                              title="Mark Damaged"
                            >
                              <MinusCircle className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openActionPanel(item, "transfer-location")}
                              className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs text-violet-700"
                              title="Transfer Location"
                            >
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => startEdit(item)}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => void handleDelete(item._id)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setHistoryItemId((current) => (current === item._id ? null : item._id))}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                            >
                              History
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedActionItem && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-slate-900">
                    Action: {actionType.replace("-", " ")} ({selectedActionItem.name})
                  </p>
                  <button
                    onClick={() => setActiveItemId(null)}
                    className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700"
                  >
                    Close
                  </button>
                </div>

                {actionType === "transfer-location" ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <select
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={transferBuilding}
                      onChange={(e) => setTransferBuilding(e.target.value)}
                    >
                      <option value="">Building</option>
                      {BUILDING_OPTIONS.map((building) => (
                        <option key={building} value={building}>{building}</option>
                      ))}
                    </select>
                    <select
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={transferRoom}
                      onChange={(e) => setTransferRoom(e.target.value)}
                    >
                      <option value="">Room</option>
                      {ROOM_OPTIONS.map((room) => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                    <select
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={transferRack}
                      onChange={(e) => setTransferRack(e.target.value)}
                    >
                      <option value="">Rack</option>
                      {RACK_OPTIONS.map((rack) => (
                        <option key={rack} value={rack}>{rack}</option>
                      ))}
                    </select>
                    <select
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={transferShelf}
                      onChange={(e) => setTransferShelf(e.target.value)}
                    >
                      <option value="">Shelf</option>
                      {SHELF_OPTIONS.map((shelf) => (
                        <option key={shelf} value={shelf}>{shelf}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    value={actionQuantity}
                    onChange={(e) => setActionQuantity(e.target.value)}
                    placeholder="Quantity"
                  />
                )}

                <textarea
                  className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Add note"
                />

                <button
                  onClick={() => void performStockAction()}
                  disabled={performingAction}
                  className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {performingAction ? "Processing..." : "Apply Action"}
                </button>
              </div>
            )}

            {historyItemId && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Box className="h-4 w-4 text-slate-600" />
                  <p className="font-semibold text-slate-900">Item Activity History</p>
                </div>

                <div className="space-y-2">
                  {(items.find((item) => item._id === historyItemId)?.activityHistory || [])
                    .slice()
                    .reverse()
                    .map((history, idx) => (
                      <div key={`${history.actionDate || ""}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-800">{history.actionType.replace(/_/g, " ")}</p>
                          <p className="text-xs text-slate-500">
                            {history.actionDate ? new Date(history.actionDate).toLocaleString() : "-"}
                          </p>
                        </div>
                        <p className="mt-1 text-slate-700">
                          Stock: {history.previousStock} {"->"} {history.newStock} ({history.quantityChange >= 0 ? "+" : ""}{history.quantityChange})
                        </p>
                        <p className="mt-1 text-slate-600">{history.note || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Location: {formatLocation(history.locationSnapshot)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
