import { useEffect, useMemo, useState } from "react";
import { Edit, MessageCircle, Trash2 } from "lucide-react";

type SocialPlatform = "whatsapp" | "instagram" | "facebook" | "linkedin";

type SocialMediaAccount = {
  _id: string;
  platform: SocialPlatform;
  accountName: string;
  profileUrl?: string;
  phoneNumber?: string;
  bio?: string;
  isActive: boolean;
};

type SocialMediaForm = {
  platform: SocialPlatform;
  accountName: string;
  profileUrl: string;
  phoneNumber: string;
  bio: string;
  isActive: boolean;
};

const API_BASE = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL || "http://localhost:5000";

const emptyForm: SocialMediaForm = {
  platform: "whatsapp",
  accountName: "",
  profileUrl: "",
  phoneNumber: "",
  bio: "",
  isActive: true,
};

const platformLabelMap: Record<SocialPlatform, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

export default function SocialMediaModule() {
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  const [formData, setFormData] = useState<SocialMediaForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        setAccounts([]);
        return;
      }

      const res = await fetch(`${API_BASE}/api/social-media/${school._id}`);
      if (!res.ok) {
        throw new Error(`Failed to load social media accounts (${res.status})`);
      }

      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Social media fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load social media accounts");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accountName.trim()) {
      setError("Account name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

      const res = await fetch(
        editingId ? `${API_BASE}/api/social-media/${editingId}` : `${API_BASE}/api/social-media`,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, schoolId: school._id }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save social media account");
      }

      resetForm();
      await fetchAccounts();
    } catch (err) {
      console.error("Social media save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save social media account");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (account: SocialMediaAccount) => {
    setEditingId(account._id);
    setFormData({
      platform: account.platform,
      accountName: account.accountName,
      profileUrl: account.profileUrl || "",
      phoneNumber: account.phoneNumber || "",
      bio: account.bio || "",
      isActive: account.isActive,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this social media account?")) return;

    try {
      setError("");
      const res = await fetch(`${API_BASE}/api/social-media/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete social media account");
      }

      if (editingId === id) {
        resetForm();
      }

      await fetchAccounts();
    } catch (err) {
      console.error("Social media delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete social media account");
    }
  };

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;

    return accounts.filter((account) =>
      [
        platformLabelMap[account.platform],
        account.accountName,
        account.phoneNumber || "",
        account.profileUrl || "",
      ].some((value) => value.toLowerCase().includes(q))
    );
  }, [accounts, search]);

  const stats = useMemo(() => {
    const active = accounts.filter((item) => item.isActive).length;
    return {
      total: accounts.length,
      active,
      inactive: accounts.length - active,
      platforms: new Set(accounts.map((item) => item.platform)).size,
    };
  }, [accounts]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat-card p-5"><p className="text-sm text-gray-500">Total Accounts</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="stat-card p-5"><p className="text-sm text-green-600">Active</p><p className="text-2xl font-bold text-green-700">{stats.active}</p></div>
        <div className="stat-card p-5"><p className="text-sm text-red-600">Inactive</p><p className="text-2xl font-bold text-red-700">{stats.inactive}</p></div>
        <div className="stat-card p-5"><p className="text-sm text-blue-600">Platforms Used</p><p className="text-2xl font-bold text-blue-700">{stats.platforms}</p></div>
      </div>

      <div className="stat-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">{editingId ? "Edit Social Account" : "Add Social Account"}</h3>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              className="border rounded p-2"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as SocialPlatform })}
              required
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
            </select>
            <input
              type="text"
              placeholder="Account Name / Handle"
              className="border rounded p-2"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Profile URL"
              className="border rounded p-2"
              value={formData.profileUrl}
              onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })}
            />
            <input
              type="text"
              placeholder="WhatsApp Number / Contact"
              className="border rounded p-2"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>

          <textarea
            placeholder="Short bio or social media notes"
            className="border rounded p-2 w-full"
            rows={3}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          />

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            Mark as active
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {saving ? "Saving..." : editingId ? "Update Account" : "Add Account"}
            </button>
            <button type="button" onClick={resetForm} className="bg-gray-200 px-4 py-2 rounded">Clear</button>
          </div>
        </form>
      </div>

      <div className="stat-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="text-lg font-semibold">Social Media Directory</h3>
          <input
            type="text"
            placeholder="Search by platform, name, number or URL"
            className="border rounded p-2 w-full md:max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-6">Loading social media accounts...</p>
        ) : filteredAccounts.length === 0 ? (
          <p className="text-center text-gray-500 py-6">No social media records found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAccounts.map((account) => (
              <div key={account._id} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{platformLabelMap[account.platform]}</p>
                    <h4 className="text-base font-semibold text-slate-900">{account.accountName}</h4>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${account.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                    {account.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {account.phoneNumber && <p className="text-sm text-slate-600">Contact: {account.phoneNumber}</p>}
                {account.profileUrl && (
                  <a href={account.profileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                    {account.profileUrl}
                  </a>
                )}
                {account.bio && <p className="text-sm text-slate-600">{account.bio}</p>}

                <div className="flex items-center gap-3 pt-1">
                  <button onClick={() => startEdit(account)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => void handleDelete(account._id)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 text-sm">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
