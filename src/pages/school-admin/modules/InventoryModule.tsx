import { useEffect, useState } from "react";
import { Edit, Package, Trash2 } from "lucide-react";

type InventoryItem = {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  location?: string;
  description?: string;
};

type InventoryForm = {
  name: string;
  category: string;
  quantity: string;
  location: string;
  description: string;
};

const emptyForm: InventoryForm = {
  name: "",
  category: "",
  quantity: "",
  location: "",
  description: "",
};

export default function InventoryModule() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [formData, setFormData] = useState<InventoryForm>(emptyForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        setItems([]);
        return;
      }

      const res = await fetch(`http://localhost:5000/api/inventory/${school._id}`);
      if (!res.ok) {
        throw new Error(`Failed to load inventory (${res.status})`);
      }

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Inventory fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load inventory");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingItemId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

      const res = await fetch(
        editingItemId
          ? `http://localhost:5000/api/inventory/${editingItemId}`
          : "http://localhost:5000/api/inventory",
        {
          method: editingItemId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            quantity: Number(formData.quantity),
            schoolId: school._id,
          }),
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

  const startEdit = (item: InventoryItem) => {
    setEditingItemId(item._id);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      location: item.location || "",
      description: item.description || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/inventory/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete inventory item");
      }

      await fetchInventory();
      if (editingItemId === id) {
        resetForm();
      }
    } catch (err) {
      console.error("Inventory delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete inventory item");
    }
  };

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCategories = new Set(items.map((item) => item.category)).size;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card p-5">
          <p className="text-sm text-gray-500">Inventory Items</p>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
        <div className="stat-card p-5">
          <p className="text-sm text-gray-500">Total Count</p>
          <p className="text-2xl font-bold text-blue-700">{totalUnits}</p>
        </div>
        <div className="stat-card p-5">
          <p className="text-sm text-gray-500">Categories</p>
          <p className="text-2xl font-bold text-green-700">{totalCategories}</p>
        </div>
      </div>

      <div className="stat-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">
            {editingItemId ? "Edit Inventory Item" : "Add Inventory Item"}
          </h3>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Item Name"
              className="border rounded p-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Category"
              className="border rounded p-2"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
            <input
              type="number"
              min="0"
              placeholder="Count"
              className="border rounded p-2"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Location"
              className="border rounded p-2"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <textarea
            placeholder="Description"
            className="border rounded p-2 w-full"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {saving ? "Saving..." : editingItemId ? "Update Item" : "Add Item"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-200 px-4 py-2 rounded"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading inventory...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-500">No inventory items yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item._id} className="stat-card p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">{item.name}</h3>
                  <p className="text-sm text-blue-700 font-medium">{item.category}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(item)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 p-3">
                <p className="text-xs text-gray-500">Count</p>
                <p className="text-2xl font-bold text-blue-800">{item.quantity}</p>
              </div>

              {item.location && (
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm">{item.location}</p>
                </div>
              )}

              {item.description && (
                <div>
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
