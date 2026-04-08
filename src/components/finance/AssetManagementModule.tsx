import { useDeferredValue, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  AlertCircle,
  BarChart3,
  Building,
  CalendarDays,
  IndianRupee,
  Package,
  Plus,
  RefreshCw,
  Search,
  Wrench,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { readStoredSchoolSession } from "@/lib/auth";

type AssetStatus = "active" | "in-use" | "under-maintenance" | "retired" | "disposed";
type DepreciationMethod = "straight-line" | "declining-balance";
type AssetRecord = {
  id: string;
  assetName: string;
  category: string;
  vendor: string;
  purchaseDate: string;
  purchaseValue: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  location: string;
  department: string;
  status: AssetStatus;
  notes: string;
};
type AssetFormState = {
  assetName: string;
  assetCode: string;
  category: string;
  vendor: string;
  purchaseDate: string;
  purchaseValue: string;
  usefulLifeYears: string;
  depreciationMethod: DepreciationMethod;
  location: string;
  department: string;
  status: AssetStatus;
  notes: string;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "in-use", label: "In Use" },
  { value: "under-maintenance", label: "Under Maintenance" },
  { value: "retired", label: "Retired" },
  { value: "disposed", label: "Disposed" },
] as const satisfies ReadonlyArray<{ value: AssetStatus; label: string }>;
const CATEGORY_OPTIONS = ["Technology", "Furniture", "Transport", "Lab Equipment", "Sports Equipment", "Library", "Infrastructure"] as const;
const METHOD_OPTIONS = [
  { value: "straight-line", label: "Straight Line" },
  { value: "declining-balance", label: "Written Down Value" },
] as const satisfies ReadonlyArray<{ value: DepreciationMethod; label: string }>;

const shell = "rounded-[28px] border border-slate-200/85 bg-[linear-gradient(180deg,#ffffff_0%,#f2f7fc_100%)] p-5 shadow-[0_18px_45px_rgba(148,163,184,0.16)]";
const card = "rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] shadow-[0_10px_28px_rgba(148,163,184,0.14)]";
const inset = "rounded-[22px] border border-slate-200/85 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_rgba(148,163,184,0.1)]";
const field = "h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 shadow-[0_2px_10px_rgba(148,163,184,0.08)] outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100";
const area = "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-[0_2px_10px_rgba(148,163,184,0.08)] outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

const getTodayYMD = () => new Date().toISOString().slice(0, 10);
const formatCurrency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
const formatDate = (value: string) => (value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const getStatusLabel = (status: AssetStatus) => STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
const getMethodLabel = (value: DepreciationMethod) => METHOD_OPTIONS.find((item) => item.value === value)?.label || value;
const defaultForm = (): AssetFormState => ({ assetName: "", assetCode: "", category: "Technology", vendor: "", purchaseDate: getTodayYMD(), purchaseValue: "", usefulLifeYears: "5", depreciationMethod: "straight-line", location: "", department: "", status: "active", notes: "" });

function getStatusTone(status: AssetStatus) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "in-use") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "under-maintenance") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "retired") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function computeDepreciation(asset: Pick<AssetRecord, "purchaseValue" | "purchaseDate" | "usefulLifeYears" | "depreciationMethod">) {
  const purchaseValue = Number(asset.purchaseValue || 0);
  const purchaseDate = new Date(asset.purchaseDate);
  if (Number.isNaN(purchaseDate.getTime()) || purchaseValue <= 0) return { accumulatedDepreciation: 0, annualDepreciation: 0, currentBookValue: purchaseValue };
  const years = Math.max(0, (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  if (asset.depreciationMethod === "straight-line") {
    const annual = purchaseValue / Math.max(asset.usefulLifeYears, 1);
    const accumulated = Math.min(purchaseValue, annual * years);
    return { accumulatedDepreciation: accumulated, annualDepreciation: annual, currentBookValue: Math.max(0, purchaseValue - accumulated) };
  }
  const rate = 1 / Math.max(asset.usefulLifeYears, 1);
  const current = Math.max(0, purchaseValue * Math.pow(1 - rate, years));
  return { accumulatedDepreciation: purchaseValue - current, annualDepreciation: purchaseValue * rate, currentBookValue: current };
}

function SectionHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h3 className="text-[1.65rem] font-bold tracking-[-0.02em] text-slate-950">{title}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p></div>{action}</div>;
}

function StatCard({ icon: Icon, label, value, tone }: { icon: ElementType; label: string; value: string; tone: string }) {
  return <div className={`${card} p-5`}><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-600">{label}</p><p className="mt-4 text-[2rem] font-extrabold tracking-[-0.03em] text-slate-950">{value}</p></div><div className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm ${tone}`}><Icon className="h-5 w-5" /></div></div></div>;
}

export default function AssetManagementModule() {
  const schoolId = String(readStoredSchoolSession()?._id || "");
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [formState, setFormState] = useState<AssetFormState>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);

  const loadAssets = async () => {
    if (!schoolId) {
      setLoading(false);
      setError("School session not found. Please log in again.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/api/banking/${schoolId}`);
      const payload = await response.json().catch(() => null) as { data?: { assets?: AssetRecord[] }; message?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.message || "Failed to load asset register");
      setAssets(Array.isArray(payload.data.assets) ? payload.data.assets : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load asset register");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAssets(); }, [schoolId]);
  useEffect(() => { if (!selectedAssetId || !assets.some((asset) => asset.id === selectedAssetId)) setSelectedAssetId(assets[0]?.id || ""); }, [assets, selectedAssetId]);

  const filteredAssets = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchSearch = !query || [asset.id, asset.assetName, asset.category, asset.vendor, asset.department, asset.location, asset.notes].join(" ").toLowerCase().includes(query);
      const matchCategory = categoryFilter === "All Categories" || asset.category === categoryFilter;
      const matchStatus = statusFilter === "All Statuses" || asset.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [assets, categoryFilter, deferredSearch, statusFilter]);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) || filteredAssets[0] || null;
  const selectedMetrics = selectedAsset ? computeDepreciation(selectedAsset) : null;
  const overview = useMemo(() => {
    const purchase = assets.reduce((sum, asset) => sum + asset.purchaseValue, 0);
    const book = assets.reduce((sum, asset) => sum + computeDepreciation(asset).currentBookValue, 0);
    return { count: assets.length, purchase, book, maintenance: assets.filter((asset) => asset.status === "under-maintenance").length };
  }, [assets]);
  const lifecycleCounts = useMemo(() => STATUS_OPTIONS.map((option) => ({ ...option, count: assets.filter((asset) => asset.status === option.value).length })), [assets]);
  const selectedTimeline = useMemo(() => {
    if (!selectedAsset) return [];
    const base = [{ id: `${selectedAsset.id}-registered`, title: "Asset registered", date: selectedAsset.purchaseDate, text: selectedAsset.vendor ? `Registered from ${selectedAsset.vendor}.` : "Registered in the asset ledger." }];
    if (selectedAsset.department || selectedAsset.location) base.push({ id: `${selectedAsset.id}-assigned`, title: "Assigned to school unit", date: selectedAsset.purchaseDate, text: [selectedAsset.department, selectedAsset.location].filter(Boolean).join(" | ") });
    if (selectedAsset.status !== "active") base.push({ id: `${selectedAsset.id}-status`, title: `Current status: ${getStatusLabel(selectedAsset.status)}`, date: getTodayYMD(), text: "Tracked from the backend asset register." });
    if (selectedAsset.notes.trim()) base.push({ id: `${selectedAsset.id}-notes`, title: "Notes on record", date: getTodayYMD(), text: selectedAsset.notes.trim() });
    return base;
  }, [selectedAsset]);

  const saveAsset = () => {
    if (!schoolId) return setError("School session not found. Please log in again.");
    if (!formState.assetName.trim() || Number(formState.purchaseValue) <= 0 || Number(formState.usefulLifeYears) <= 0) return setError("Please complete asset name, purchase value, and useful life.");
    void (async () => {
      try {
        setSaving(true);
        setError("");
        const response = await fetch(`${API_URL}/api/banking/${schoolId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: formState.assetCode.trim(), assetName: formState.assetName.trim(), category: formState.category, vendor: formState.vendor.trim(), purchaseDate: formState.purchaseDate, purchaseValue: Number(formState.purchaseValue), usefulLifeYears: Number(formState.usefulLifeYears), depreciationMethod: formState.depreciationMethod, location: formState.location.trim(), department: formState.department.trim(), status: formState.status, notes: formState.notes.trim() }),
        });
        const payload = await response.json().catch(() => null) as { data?: { assets?: AssetRecord[] }; message?: string } | null;
        if (!response.ok || !payload?.data) throw new Error(payload?.message || "Failed to save asset");
        const nextAssets = Array.isArray(payload.data.assets) ? payload.data.assets : [];
        setAssets(nextAssets);
        setSelectedAssetId(formState.assetCode.trim() || nextAssets[0]?.id || "");
        setFormState(defaultForm());
        setShowAddForm(false);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to save asset");
      } finally {
        setSaving(false);
      }
    })();
  };

  const updateStatus = (status: AssetStatus) => {
    if (!schoolId || !selectedAsset || status === selectedAsset.status) return;
    void (async () => {
      try {
        setStatusSaving(true);
        setError("");
        const response = await fetch(`${API_URL}/api/banking/${schoolId}/assets/${selectedAsset.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
        const payload = await response.json().catch(() => null) as { data?: { assets?: AssetRecord[] }; message?: string } | null;
        if (!response.ok || !payload?.data) throw new Error(payload?.message || "Failed to update asset status");
        setAssets(Array.isArray(payload.data.assets) ? payload.data.assets : []);
        setSelectedAssetId(selectedAsset.id);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to update asset status");
      } finally {
        setStatusSaving(false);
      }
    })();
  };

  return (
    <div className="space-y-6 rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(219,234,254,0.55),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] p-2">
      <section className={`${shell} bg-[linear-gradient(135deg,#fbfcff_0%,#edf3fb_58%,#f8f4ef_100%)]`}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl"><div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-slate-700 shadow-sm">Asset Area</div><h3 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-slate-950">School asset register and lifecycle desk</h3><p className="mt-3 text-base leading-7 text-slate-700">This screen now reads the live backend asset register, and the layout gives the register the space it needs instead of squeezing it into a cramped split view.</p></div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void loadAssets()} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-[0_8px_24px_rgba(148,163,184,0.12)] transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
            <button type="button" onClick={() => setShowAddForm((value) => !value)} className="inline-flex items-center gap-2 rounded-2xl border border-sky-300 bg-[linear-gradient(180deg,#ffffff_0%,#dff1ff_100%)] px-4 py-3 text-sm font-bold text-sky-800 shadow-[0_10px_24px_rgba(56,189,248,0.14)] transition hover:border-sky-400 hover:shadow-[0_14px_28px_rgba(56,189,248,0.18)]"><Plus className="h-4 w-4" />{showAddForm ? "Hide Asset Form" : "Add New Asset"}</button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Package} label="Total Assets" value={String(overview.count)} tone="border-sky-100 bg-sky-50 text-sky-700" />
          <StatCard icon={IndianRupee} label="Total Purchase Value" value={formatCurrency(overview.purchase)} tone="border-indigo-100 bg-indigo-50 text-indigo-700" />
          <StatCard icon={BarChart3} label="Current Book Value" value={formatCurrency(overview.book)} tone="border-emerald-100 bg-emerald-50 text-emerald-700" />
          <StatCard icon={Wrench} label="Under Maintenance" value={String(overview.maintenance)} tone="border-amber-100 bg-amber-50 text-amber-700" />
        </div>
      </section>

      {error && <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div></div>}

      {showAddForm && (
        <section className={shell}>
          <SectionHeading title="Add Asset Form" description="Create a backend-backed asset record with purchase, department, and depreciation details." />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="xl:col-span-2"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Asset Name</span><input value={formState.assetName} onChange={(e) => setFormState((p) => ({ ...p, assetName: e.target.value }))} className={field} placeholder="e.g. Biology Lab Freezer" /></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Asset Code / ID</span><input value={formState.assetCode} onChange={(e) => setFormState((p) => ({ ...p, assetCode: e.target.value }))} className={field} placeholder="Optional" /></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</span><select value={formState.category} onChange={(e) => setFormState((p) => ({ ...p, category: e.target.value }))} className={field}>{CATEGORY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vendor / Supplier</span><input value={formState.vendor} onChange={(e) => setFormState((p) => ({ ...p, vendor: e.target.value }))} className={field} /></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Purchase Date</span><input type="date" value={formState.purchaseDate} onChange={(e) => setFormState((p) => ({ ...p, purchaseDate: e.target.value }))} className={field} /></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Purchase Value</span><input type="number" min="0" value={formState.purchaseValue} onChange={(e) => setFormState((p) => ({ ...p, purchaseValue: e.target.value }))} className={field} /></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Useful Life</span><input type="number" min="1" value={formState.usefulLifeYears} onChange={(e) => setFormState((p) => ({ ...p, usefulLifeYears: e.target.value }))} className={field} /></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Depreciation Method</span><select value={formState.depreciationMethod} onChange={(e) => setFormState((p) => ({ ...p, depreciationMethod: e.target.value as DepreciationMethod }))} className={field}>{METHOD_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</span><select value={formState.status} onChange={(e) => setFormState((p) => ({ ...p, status: e.target.value as AssetStatus }))} className={field}>{STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Location / Room</span><input value={formState.location} onChange={(e) => setFormState((p) => ({ ...p, location: e.target.value }))} className={field} /></label>
            <label><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Department</span><input value={formState.department} onChange={(e) => setFormState((p) => ({ ...p, department: e.target.value }))} className={field} /></label>
            <label className="md:col-span-2 xl:col-span-4"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</span><textarea value={formState.notes} onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))} className={area} rows={3} placeholder="Maintenance notes, warranty remarks, or ownership context" /></label>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => { setFormState(defaultForm()); setShowAddForm(false); }} className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm">Cancel</button><button type="button" onClick={saveAsset} disabled={saving} className="rounded-2xl border border-sky-300 bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] px-4 py-2.5 text-sm font-bold text-sky-800 shadow-[0_8px_20px_rgba(56,189,248,0.15)] disabled:opacity-60">{saving ? "Saving..." : "Save Asset"}</button></div>
        </section>
      )}

      <section className={shell}>
        <SectionHeading title="Asset Register" description="Search and review the live backend register in a wider, calmer layout." action={<div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">{filteredAssets.length} shown</div>} />
        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${field} pl-11`}
              placeholder="Search by asset ID, name, vendor, department, or location"
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={field}>
            <option>All Categories</option>
            {CATEGORY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={field}>
            <option>All Statuses</option>
            {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        {loading ? (
          <div className={`${inset} mt-5 flex min-h-[220px] items-center justify-center text-sm font-medium text-slate-600`}>
            Loading asset register from the backend...
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className={`${inset} mt-5 border-2 border-dashed border-slate-300 p-10 text-center`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm">
              <Package className="h-6 w-6" />
            </div>
            <h4 className="mt-4 text-lg font-bold text-slate-950">No assets in the register yet</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Dummy data has been removed. Add an asset or confirm the backend has records for this school.
            </p>
          </div>
        ) : (
          <div className={`${inset} mt-5 overflow-x-auto`}>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100/90 text-left text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700">
                <tr>
                  <th className="px-4 py-3">Asset ID</th>
                  <th className="px-4 py-3">Asset Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Purchase Date</th>
                  <th className="px-4 py-3">Purchase Value</th>
                  <th className="px-4 py-3">Depreciation</th>
                  <th className="px-4 py-3">Book Value</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => {
                  const metrics = computeDepreciation(asset);

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`cursor-pointer border-b border-slate-200/80 ${
                        asset.id === selectedAsset?.id ? "bg-sky-100/70" : "bg-white/70 hover:bg-slate-50/90"
                      }`}
                    >
                      <td className="px-4 py-4 font-bold text-slate-900">{asset.id}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">{asset.assetName}</p>
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          {[asset.vendor, asset.department].filter(Boolean).join(" | ") || "School asset"}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700">{asset.category}</td>
                      <td className="px-4 py-4 font-medium text-slate-700">{formatDate(asset.purchaseDate)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{formatCurrency(asset.purchaseValue)}</td>
                      <td className="px-4 py-4 font-medium text-slate-700">{getMethodLabel(asset.depreciationMethod)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-950">{formatCurrency(metrics.currentBookValue)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusTone(asset.status)}`}>
                          {getStatusLabel(asset.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className={`${shell} h-fit`}>
          <SectionHeading title="Asset Lifecycle" description="Status controls are now spaced into their own panel instead of crowding the register." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{lifecycleCounts.map((item) => <div key={item.value} className={`${card} flex items-center justify-between p-4`}><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">{item.label}</p><p className="mt-2 text-xl font-bold text-slate-950">{item.count}</p></div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusTone(item.value)}`}>{item.label}</span></div>)}</div>
          {selectedAsset && <div className={`${inset} mt-5 p-4`}><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Update Selected Asset</p><div className="mt-3 flex flex-wrap gap-2">{STATUS_OPTIONS.map((item) => <button key={item.value} type="button" onClick={() => updateStatus(item.value)} disabled={statusSaving} className={`rounded-2xl border px-3 py-2 text-sm font-bold shadow-sm ${selectedAsset.status === item.value ? getStatusTone(item.value) : "border-slate-300 bg-white text-slate-700"} disabled:opacity-60`}>{item.label}</button>)}</div></div>}
        </div>

        <div className={shell}>
          <SectionHeading title="Asset Detail Card" description="Review purchase details, depreciation, and notes for the selected backend asset." />
          {selectedAsset && selectedMetrics ? <div className="mt-5 space-y-5">
            <div className={`${card} p-5`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">{selectedAsset.id}</p><h4 className="mt-2 text-2xl font-bold text-slate-950">{selectedAsset.assetName}</h4><p className="mt-1 text-sm font-medium text-slate-600">{[selectedAsset.category, selectedAsset.vendor].filter(Boolean).join(" | ") || "School asset"}</p></div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusTone(selectedAsset.status)}`}>{getStatusLabel(selectedAsset.status)}</span></div></div>
            <div className="grid gap-4 md:grid-cols-3"><div className={`${card} p-4`}><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Purchase Value</p><p className="mt-3 text-xl font-bold text-slate-950">{formatCurrency(selectedAsset.purchaseValue)}</p></div><div className={`${card} p-4`}><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Accumulated Depreciation</p><p className="mt-3 text-xl font-bold text-amber-700">{formatCurrency(selectedMetrics.accumulatedDepreciation)}</p></div><div className={`${card} p-4`}><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Current Book Value</p><p className="mt-3 text-xl font-bold text-emerald-700">{formatCurrency(selectedMetrics.currentBookValue)}</p></div></div>
            <div className={`${inset} p-5`}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Department</p><p className="mt-2 text-sm font-semibold text-slate-900">{selectedAsset.department || "-"}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Location</p><p className="mt-2 text-sm font-semibold text-slate-900">{selectedAsset.location || "-"}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Method</p><p className="mt-2 text-sm font-semibold text-slate-900">{getMethodLabel(selectedAsset.depreciationMethod)}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Useful Life</p><p className="mt-2 text-sm font-semibold text-slate-900">{selectedAsset.usefulLifeYears} years</p></div></div></div>
            <div className="grid gap-4 lg:grid-cols-2"><div className={`${card} p-5`}><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700"><Building className="h-4 w-4" /></div><div><p className="text-sm font-bold text-slate-950">Purchase Details</p><p className="text-xs font-medium text-slate-600">Procurement and assignment context.</p></div></div><div className="mt-4 grid gap-3 text-sm text-slate-700"><p><span className="font-bold text-slate-900">Vendor:</span> {selectedAsset.vendor || "-"}</p><p><span className="font-bold text-slate-900">Purchase Date:</span> {formatDate(selectedAsset.purchaseDate)}</p><p><span className="font-bold text-slate-900">Category:</span> {selectedAsset.category}</p></div></div><div className={`${card} p-5`}><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700"><CalendarDays className="h-4 w-4" /></div><div><p className="text-sm font-bold text-slate-950">Notes / History</p><p className="text-xs font-medium text-slate-600">Simple timeline from backend asset details.</p></div></div><div className="mt-4 space-y-3">{selectedTimeline.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-950">{item.title}</p><span className="text-xs font-medium text-slate-500">{formatDate(item.date)}</span></div><p className="mt-2 text-sm text-slate-700">{item.text}</p></div>)}</div></div></div>
            <div className={`${inset} p-5`}><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Notes</p><p className="mt-3 text-sm leading-6 text-slate-700">{selectedAsset.notes.trim() || "No notes have been recorded for this asset yet."}</p></div>
          </div> : <div className={`${inset} mt-5 p-8 text-sm text-slate-500`}>Select an asset from the register to review its detail card and depreciation summary.</div>}
        </div>
      </section>
    </div>
  );
}
