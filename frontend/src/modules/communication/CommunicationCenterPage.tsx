import { useCallback, useEffect, useMemo, useState } from "react";
import { readStoredSchoolSession, readStoredRoleUser } from "@/lib/auth";
import {
  Bell, Calendar, CheckCircle2, ChevronDown, Clock, Copy,
  FileEdit, FileText, Globe, GraduationCap, Image,
  Mail, Megaphone, Menu, MessageSquare, Pin, Plus, RefreshCw,
  Send, Sparkles, SquarePen, Users, X, Wifi, Zap,
} from "lucide-react";
import { FaWhatsapp, FaFacebook, FaInstagram, FaSms } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AnnouncementForm from "./AnnouncementForm";
import AnnouncementFilters from "./AnnouncementFilters";
import AnnouncementList from "./AnnouncementList";
import TemplatesTab, { type MessageTemplate } from "./TemplatesTab";
import CalendarTab from "./CalendarTab";
import {
  createDefaultAnnouncementForm,
  type AnnouncementAudience,
  type AnnouncementFilter,
  type AnnouncementFormValues,
  type AnnouncementItem,
  type AnnouncementPriority,
} from "./types";

// ─── API types (match backend exactly) ───────────────────────────────────────

type ChannelKey = "APP" | "EMAIL" | "SMS" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "WEBSITE";

interface CommunicationStats {
  activeCampaigns: number;
  scheduledCount: number;
  whatsappSends24h: number;
  emailSmsSentWeek: number;
}

interface CampaignChannel {
  channel: ChannelKey;
  isEnabled: boolean;
}

interface Campaign {
  id: string;
  title: string;
  subtitle?: string;
  channels: CampaignChannel[];
  audienceLabel: string;
  status: "DRAFT" | "SCHEDULED" | "SENT" | "CANCELLED";
  scheduledAt?: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  approvalStatus: "NONE" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  ownerName: string;
}

interface CampaignsResponse {
  data: Campaign[];
  total: number;
  page: number;
  pages: number;
}

// ─── Form state (internal, not API) ──────────────────────────────────────────

interface CampaignFormState {
  title: string;
  internalNote: string;
  publicCaption: string;
  messageBody: string;
  channels: ChannelKey[];
  audience: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  scheduleEnabled: boolean;
  scheduledAt: string;
  approvalRequired: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_CHANNELS: { key: ChannelKey; label: string }[] = [
  { key: "APP", label: "In-App" },
  { key: "EMAIL", label: "Email" },
  { key: "SMS", label: "SMS" },
  { key: "WHATSAPP", label: "WhatsApp" },
  { key: "FACEBOOK", label: "Facebook" },
  { key: "INSTAGRAM", label: "Instagram" },
  { key: "WEBSITE", label: "Website" },
];

const ALL_CHANNEL_KEYS: ChannelKey[] = ALL_CHANNELS.map((c) => c.key);

const AUDIENCE_OPTIONS = ["All", "Parents", "Students", "Teachers", "Staff"];

const CONNECTED_CHANNELS: { key: ChannelKey; label: string; connected: boolean }[] = [
  { key: "APP", label: "In-App", connected: true },
  { key: "EMAIL", label: "Email", connected: true },
  { key: "SMS", label: "SMS", connected: false },
  { key: "WHATSAPP", label: "WhatsApp", connected: false },
  { key: "FACEBOOK", label: "Facebook", connected: false },
  { key: "INSTAGRAM", label: "Instagram", connected: false },
];

type ActiveTab = "announcements" | "campaigns" | "calendar" | "templates";

const NAV_ITEMS: { label: string; tab: ActiveTab; icon: React.ReactNode }[] = [
  { label: "Announcements", tab: "announcements", icon: <Bell className="h-4 w-4" /> },
  { label: "Campaigns", tab: "campaigns", icon: <Megaphone className="h-4 w-4" /> },
  { label: "Calendar", tab: "calendar", icon: <Calendar className="h-4 w-4" /> },
  { label: "Templates", tab: "templates", icon: <FileText className="h-4 w-4" /> },
];

const defaultCampaignForm = (): CampaignFormState => ({
  title: "",
  internalNote: "",
  publicCaption: "",
  messageBody: "",
  channels: ["APP", "EMAIL", "SMS", "WHATSAPP", "FACEBOOK", "INSTAGRAM", "WEBSITE"],
  audience: "All",
  priority: "NORMAL",
  scheduleEnabled: false,
  scheduledAt: "",
  approvalRequired: false,
});

// ─── Small UI atoms ───────────────────────────────────────────────────────────

const CHANNEL_META: Record<ChannelKey, { label: string; color: string; renderIcon: (active: boolean) => React.ReactNode }> = {
  APP:       { label: "In-App",    color: "bg-blue-100 text-blue-700",     renderIcon: (a) => <Bell      className="h-4 w-4" style={{ color: a ? "#fff" : undefined }} /> },
  EMAIL:     { label: "Email",     color: "bg-purple-100 text-purple-700", renderIcon: (a) => <Mail      className="h-4 w-4" style={{ color: a ? "#fff" : undefined }} /> },
  SMS:       { label: "SMS",       color: "bg-green-100 text-green-700",   renderIcon: (a) => <FaSms     style={{ fontSize: "16px", color: a ? "#fff" : "#16a34a" }} /> },
  WHATSAPP:  { label: "WhatsApp",  color: "bg-emerald-100 text-emerald-700", renderIcon: (a) => <FaWhatsapp style={{ fontSize: "16px", color: a ? "#fff" : "#25D366" }} /> },
  FACEBOOK:  { label: "Facebook",  color: "bg-blue-100 text-blue-600",     renderIcon: (a) => <FaFacebook style={{ fontSize: "16px", color: a ? "#fff" : "#1877F2" }} /> },
  INSTAGRAM: { label: "Instagram", color: "bg-pink-100 text-pink-600",     renderIcon: (a) => <FaInstagram style={{ fontSize: "16px", color: a ? "#fff" : "#E1306C" }} /> },
  WEBSITE:   { label: "Website",   color: "bg-cyan-100 text-cyan-700",     renderIcon: (a) => <Globe     className="h-4 w-4" style={{ color: a ? "#fff" : undefined }} /> },
};

const ChannelBadge: React.FC<{ channel: ChannelKey }> = ({ channel }) => {
  const meta = CHANNEL_META[channel];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
      {meta.renderIcon(false)} {meta.label}
    </span>
  );
};

const PRIORITY_COLOR: Record<Campaign["priority"], string> = {
  LOW: "bg-slate-100 text-slate-600",
  NORMAL: "bg-sky-100 text-sky-700",
  HIGH: "bg-orange-100 text-orange-700",
};

const STATUS_META: Record<Campaign["status"], { color: string; icon: React.ReactNode }> = {
  SCHEDULED: { color: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> },
  SENT: { color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  DRAFT: { color: "bg-slate-100 text-slate-600", icon: <FileEdit className="h-3 w-3" /> },
  CANCELLED: { color: "bg-red-100 text-red-600", icon: <X className="h-3 w-3" /> },
};

const StatusPill: React.FC<{ status: Campaign["status"] }> = ({ status }) => {
  const { color, icon } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {icon} {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

const ApprovalPill: React.FC<{ status: Campaign["approvalStatus"] }> = ({ status }) => {
  const map: Record<Campaign["approvalStatus"], string> = {
    NONE: "bg-slate-50 text-slate-400",
    PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  if (status === "NONE") return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
};

// ─── KPI cards ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  sub?: string;
  accent?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, sub, accent = "text-slate-400" }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <span className={accent}>{icon}</span>
    </div>
    <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
  </div>
);

const SkeletonCard: React.FC = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
    <div className="h-3 w-24 rounded bg-slate-200" />
    <div className="mt-3 h-8 w-16 rounded bg-slate-200" />
    <div className="mt-1 h-3 w-20 rounded bg-slate-100" />
  </div>
);

const StatsRow: React.FC<{ stats: CommunicationStats | null; loading: boolean }> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Active Campaigns" value={stats.activeCampaigns} icon={<Megaphone className="h-4 w-4" />} sub="draft + scheduled" accent="text-blue-400" />
      <StatCard label="Scheduled" value={stats.scheduledCount} icon={<Clock className="h-4 w-4" />} sub="upcoming sends" accent="text-amber-400" />
      <StatCard label="WhatsApp (24h)" value={stats.whatsappSends24h} icon={<MessageSquare className="h-4 w-4" />} sub="delivered" accent="text-emerald-400" />
      <StatCard label="Email &amp; SMS (week)" value={stats.emailSmsSentWeek} icon={<Mail className="h-4 w-4" />} sub="sent" accent="text-purple-400" />
    </div>
  );
};

// ─── Campaigns table ──────────────────────────────────────────────────────────

const CampaignsTable: React.FC<{
  campaigns: Campaign[];
  loading: boolean;
  onDelete: (id: string) => void;
}> = ({ campaigns, loading, onDelete }) => {
  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-slate-100" />)}
      </div>
    );
  }
  if (!campaigns.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-14 text-center text-sm text-slate-400">
        No campaigns yet. Fill in the form above and click <strong>Send campaign</strong>.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {["Campaign", "Channels", "Audience", "Priority", "Status", "Approval", "Scheduled", ""].map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 max-w-[200px]">
                <p className="font-medium text-slate-800 truncate">{c.title}</p>
                {c.subtitle && <p className="text-xs text-slate-400 truncate">{c.subtitle}</p>}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {c.channels.filter((ch) => ch.isEnabled).map((ch) => (
                    <ChannelBadge key={ch.channel} channel={ch.channel} />
                  ))}
                  {c.channels.filter((ch) => ch.isEnabled).length === 0 && (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.audienceLabel || "All"}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[c.priority]}`}>
                  {c.priority}
                </span>
              </td>
              <td className="px-4 py-3"><StatusPill status={c.status} /></td>
              <td className="px-4 py-3"><ApprovalPill status={c.approvalStatus} /></td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-3">
                <Button variant="ghost" size="sm" onClick={() => onDelete(c.id)} className="text-slate-300 hover:text-red-500 h-7 w-7 p-0">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Top navigation bar ───────────────────────────────────────────────────────

const TopNav: React.FC<{
  activeTab: ActiveTab;
  onTabChange: (t: ActiveTab) => void;
  schoolName: string;
}> = ({ activeTab, onTabChange, schoolName }) => (
  <nav className="border-b border-slate-200 bg-white">
    {/* Row 1 — brand + channels */}
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-bold text-slate-900 leading-tight">ERP Portal</p>
          <p className="text-[10px] text-slate-400 leading-tight">{schoolName}</p>
        </div>
      </div>

      {/* Connected channels — compact pill row */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <Wifi className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        {CONNECTED_CHANNELS.map(({ key, label, connected }) => (
          <span
            key={key}
            title={label}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${
              connected
                ? `${CHANNEL_META[key].color} border-transparent`
                : "border-slate-200 bg-slate-50 text-slate-400"
            }`}
          >
            {CHANNEL_META[key].icon}
            <span className="hidden md:inline">{CHANNEL_META[key].label}</span>
            {connected && <span className="text-[8px]">●</span>}
          </span>
        ))}
        <button className="ml-1 shrink-0 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[10px] text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors whitespace-nowrap">
          + Connect
        </button>
      </div>
    </div>

    {/* Row 2 — horizontal tab nav */}
    <div className="flex overflow-x-auto border-t border-slate-100 px-4 sm:px-6">
      {NAV_ITEMS.map(({ label, tab, icon }) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === tab
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className={activeTab === tab ? "text-blue-600" : "text-slate-400"}>{icon}</span>
          {label}
        </button>
      ))}
    </div>
  </nav>
);

// ─── Announcement helpers ─────────────────────────────────────────────────────

type BackendAnnouncement = {
  _id: string; title: string; message: string; author: string; createdAt: string;
};
type AnnouncementMetaRecord = {
  audience: AnnouncementAudience; priority: AnnouncementPriority;
  publishDate: string; isPinned: boolean;
};

const metaKey = (id: string) => `school-communication-meta:${id}`;
const draftsKey = (id: string) => `school-communication-drafts:${id}`;

function loadMeta(schoolId: string): Record<string, AnnouncementMetaRecord> {
  try { const r = localStorage.getItem(metaKey(schoolId)); return r ? JSON.parse(r) : {}; } catch { return {}; }
}
function saveMeta(schoolId: string, v: Record<string, AnnouncementMetaRecord>) {
  localStorage.setItem(metaKey(schoolId), JSON.stringify(v));
}
function loadDrafts(schoolId: string): AnnouncementItem[] {
  try { const r = localStorage.getItem(draftsKey(schoolId)); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveDrafts(schoolId: string, v: AnnouncementItem[]) {
  localStorage.setItem(draftsKey(schoolId), JSON.stringify(v));
}
function sortItems(items: AnnouncementItem[]) {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return Number(b.isPinned) - Number(a.isPinned);
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  });
}
function isDraft(id: string) { return id.startsWith("draft-"); }
function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ann-${Date.now()}`;
}
function newDraftId() { return `draft-${newId()}`; }
function mapBackend(a: BackendAnnouncement, meta: Record<string, AnnouncementMetaRecord>): AnnouncementItem {
  const m = meta[a._id];
  return {
    id: a._id, title: a.title, message: a.message,
    audience: m?.audience ?? "All", priority: m?.priority ?? "Normal",
    status: "Published",
    publishDate: m?.publishDate ?? new Date(a.createdAt).toISOString().slice(0, 10),
    isPinned: m?.isPinned ?? false, createdAt: a.createdAt,
  };
}
function metaFromItem(a: AnnouncementItem): AnnouncementMetaRecord {
  return { audience: a.audience, priority: a.priority, publishDate: a.publishDate, isPinned: a.isPinned };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CommunicationCenterPageProps {
  schoolId?: string;
}

const CommunicationCenterPage: React.FC<CommunicationCenterPageProps> = ({ schoolId: schoolIdProp }) => {
  const school = readStoredSchoolSession();
  const schoolId = schoolIdProp ?? (school?._id ? String(school._id) : "demo-school-id");
  const schoolName = school?.schoolInfo?.name ?? "School";
  const currentUser = readStoredRoleUser();
  const authorName = currentUser?.name ?? school?.adminInfo?.name ?? "School Administration";

  // ── Layout state ──
  const [activeTab, setActiveTab] = useState<ActiveTab>("announcements");

  // ── Communication (stats + campaigns) ──
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [commLoading, setCommLoading] = useState(true);
  const [commError, setCommError] = useState("");

  // ── Campaign form ──
  const [form, setForm] = useState<CampaignFormState>(defaultCampaignForm);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignError, setCampaignError] = useState("");

  // ── Announcements ──
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [annForm, setAnnForm] = useState<AnnouncementFormValues>(createDefaultAnnouncementForm);
  const [annLoading, setAnnLoading] = useState(true);
  const [annSaving, setAnnSaving] = useState(false);
  const [annError, setAnnError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<AnnouncementFilter>("All");

  // ── Templates ──
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // ─── Fetch: stats + campaigns ────────────────────────────────────────────

  const fetchComm = useCallback(async () => {
    setCommLoading(true);
    setCommError("");
    try {
      const [statsRes, campaignsRes] = await Promise.all([
        fetch(`/api/communication/stats?schoolId=${schoolId}`),
        fetch(`/api/communication/campaigns?schoolId=${schoolId}`),
      ]);
      if (!statsRes.ok || !campaignsRes.ok) {
        throw new Error("Failed to load communication data");
      }
      const [statsData, campaignsData] = await Promise.all([
        statsRes.json() as Promise<CommunicationStats>,
        campaignsRes.json() as Promise<CampaignsResponse>,
      ]);
      setStats(statsData);
      setCampaigns(Array.isArray(campaignsData.data) ? campaignsData.data : []);
    } catch (err) {
      setCommError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setCommLoading(false);
    }
  }, [schoolId]);

  const fetchAnnouncements = useCallback(async () => {
    if (!schoolId) { setAnnLoading(false); return; }
    setAnnLoading(true);
    setAnnError("");
    try {
      const res = await fetch(`/api/announcements/${schoolId}`);
      if (!res.ok) throw new Error(`Failed to load announcements (${res.status})`);
      const data = await res.json().catch(() => []);
      const meta = loadMeta(schoolId);
      const published = Array.isArray(data)
        ? data.map((a) => mapBackend(a as BackendAnnouncement, meta))
        : [];
      setAnnouncements(sortItems([...published, ...loadDrafts(schoolId)]));
    } catch {
      setAnnouncements(sortItems(loadDrafts(schoolId)));
    } finally {
      setAnnLoading(false);
    }
  }, [schoolId]);

  const fetchTemplates = useCallback(async () => {
    if (!schoolId) return;
    setTemplatesLoading(true);
    try {
      const res = await fetch(`/api/communication/templates?schoolId=${schoolId}`);
      const data = await res.json().catch(() => []);
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchComm();
    fetchAnnouncements();
    fetchTemplates();
    const handler = () => fetchAnnouncements();
    window.addEventListener("announcements-updated", handler);
    return () => window.removeEventListener("announcements-updated", handler);
  }, [fetchComm, fetchAnnouncements, fetchTemplates]);

  // ─── Campaign handlers ────────────────────────────────────────────────────

  const setFormField = <K extends keyof CampaignFormState>(k: K, v: CampaignFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleChannel = (ch: ChannelKey) =>
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter((c) => c !== ch)
        : [...f.channels, ch],
    }));

  const submitCampaign = async (intent: "DRAFT" | "SEND") => {
    if (!form.title.trim() || !form.messageBody.trim()) {
      setCampaignError("Campaign title and message body are required.");
      return;
    }
    setCampaignSaving(true);
    setCampaignError("");
    try {
      const status =
        intent === "SEND" && form.scheduleEnabled ? "SCHEDULED"
        : intent === "SEND" ? "SENT"
        : "DRAFT";

      const res = await fetch("/api/communication/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          internalNote: form.internalNote,
          publicCaption: form.publicCaption,
          body: form.messageBody,
          channels: form.channels.map((ch) => ({ channel: ch, isEnabled: true })),
          audience: form.audience !== "All" ? [{ type: form.audience.toUpperCase() }] : [],
          priority: form.priority,
          status,
          scheduledAt: form.scheduleEnabled && form.scheduledAt ? form.scheduledAt : undefined,
          approvalRequired: form.approvalRequired,
          schoolId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message ?? "Failed to save campaign");

      setCampaigns((cur) => [data.data as Campaign, ...cur]);
      setStats((s) =>
        s
          ? {
              ...s,
              activeCampaigns: s.activeCampaigns + 1,
              scheduledCount: status === "SCHEDULED" ? s.scheduledCount + 1 : s.scheduledCount,
            }
          : s
      );
      setForm(defaultCampaignForm);
    } catch (err) {
      setCampaignError(err instanceof Error ? err.message : "Failed to save campaign");
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    await fetch(`/api/communication/campaigns/${id}`, { method: "DELETE" });
    setCampaigns((cur) => cur.filter((c) => c.id !== id));
  };

  // ─── Announcement handlers ────────────────────────────────────────────────

  const handleAnnFormChange = <K extends keyof AnnouncementFormValues>(
    field: K, value: AnnouncementFormValues[K]
  ) => setAnnForm((f) => ({ ...f, [field]: value }));

  const handleAiDraft = async (topic: string) => {
    const res = await fetch("/api/announcements/ai-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, author: authorName }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) throw new Error(data?.message ?? "AI draft failed");
    setAnnForm((f) => ({
      ...f,
      title: data.data.title ?? f.title,
      message: data.data.message ?? f.message,
    }));
  };

  const handleCreateAnnouncement = async () => {
    if (!annForm.title.trim() || !annForm.message.trim() || !schoolId) return;
    const base: AnnouncementItem = {
      id: newId(), title: annForm.title.trim(), message: annForm.message.trim(),
      audience: annForm.audience, priority: annForm.priority, status: annForm.status,
      publishDate: annForm.publishDate, isPinned: annForm.isPinned,
      createdAt: new Date().toISOString(),
    };
    setAnnSaving(true);
    setAnnError("");
    try {
      if (annForm.status === "Draft") {
        const draft = { ...base, id: newDraftId(), status: "Draft" as const };
        saveDrafts(schoolId, sortItems([...loadDrafts(schoolId), draft]));
        setAnnouncements((cur) => sortItems([...cur, draft]));
      } else {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: base.title, message: base.message, author: authorName, schoolId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !data?.data?._id)
          throw new Error(data?.message ?? "Failed to create announcement");
        const meta = loadMeta(schoolId);
        meta[String(data.data._id)] = metaFromItem({ ...base, id: String(data.data._id), status: "Published" });
        saveMeta(schoolId, meta);
        setAnnouncements((cur) => sortItems([mapBackend(data.data as BackendAnnouncement, meta), ...cur]));
        window.dispatchEvent(new Event("announcements-updated"));
      }
      setAnnForm(createDefaultAnnouncementForm());
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setAnnSaving(false);
    }
  };

  const handleTogglePin = (id: string) => {
    if (!schoolId) return;
    setAnnouncements((cur) => {
      const next = sortItems(cur.map((a) => a.id === id ? { ...a, isPinned: !a.isPinned } : a));
      if (isDraft(id)) saveDrafts(schoolId, next.filter((a) => isDraft(a.id)));
      else {
        const u = next.find((a) => a.id === id);
        if (u) { const m = loadMeta(schoolId); m[id] = metaFromItem(u); saveMeta(schoolId, m); }
      }
      return next;
    });
  };

  const handleToggleStatus = async (id: string) => {
    if (!schoolId) return;
    const item = announcements.find((a) => a.id === id);
    if (!item) return;
    setAnnSaving(true);
    setAnnError("");
    try {
      if (isDraft(id)) {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: item.title, message: item.message, author: authorName, schoolId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !data?.data?._id)
          throw new Error(data?.message ?? "Failed to publish");
        saveDrafts(schoolId, loadDrafts(schoolId).filter((a) => a.id !== id));
        const meta = loadMeta(schoolId);
        meta[String(data.data._id)] = metaFromItem({ ...item, id: String(data.data._id), status: "Published" });
        saveMeta(schoolId, meta);
        setAnnouncements((cur) =>
          sortItems([mapBackend(data.data as BackendAnnouncement, meta), ...cur.filter((a) => a.id !== id)])
        );
        window.dispatchEvent(new Event("announcements-updated"));
      } else {
        const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => null);
        if (!res.ok || data?.success === false) throw new Error(data?.message ?? "Failed to move to draft");
        const meta = loadMeta(schoolId); delete meta[id]; saveMeta(schoolId, meta);
        const draft: AnnouncementItem = { ...item, id: newDraftId(), status: "Draft" };
        saveDrafts(schoolId, sortItems([...loadDrafts(schoolId), draft]));
        setAnnouncements((cur) => sortItems([draft, ...cur.filter((a) => a.id !== id)]));
        window.dispatchEvent(new Event("announcements-updated"));
      }
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setAnnSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!schoolId) return;
    setAnnSaving(true);
    setAnnError("");
    try {
      if (isDraft(id)) {
        saveDrafts(schoolId, loadDrafts(schoolId).filter((a) => a.id !== id));
        setAnnouncements((cur) => cur.filter((a) => a.id !== id));
      } else {
        const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => null);
        if (!res.ok || data?.success === false) throw new Error(data?.message ?? "Failed to delete");
        const meta = loadMeta(schoolId); delete meta[id]; saveMeta(schoolId, meta);
        setAnnouncements((cur) => cur.filter((a) => a.id !== id));
        window.dispatchEvent(new Event("announcements-updated"));
      }
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setAnnSaving(false);
    }
  };

  const handleUseTemplate = (subject: string, body: string) => {
    setAnnForm((f) => ({ ...f, title: subject, message: body }));
    setActiveTab("announcements");
  };

  // ─── Derived ──────────────────────────────────────────────────────────────

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortItems(announcements).filter((a) => {
      const matchSearch = !q || a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q);
      const matchFilter =
        activeFilter === "All" ||
        (activeFilter === "Pinned" && a.isPinned) ||
        (activeFilter === "Draft" && a.status === "Draft") ||
        (activeFilter === "Published" && a.status === "Published");
      return matchSearch && matchFilter;
    });
  }, [activeFilter, announcements, searchQuery]);

  const publishedCount = announcements.filter((a) => a.status === "Published").length;
  const draftCount = announcements.filter((a) => a.status === "Draft").length;
  const pinnedCount = announcements.filter((a) => a.isPinned).length;
  const canSubmitAnn = !annSaving && annForm.title.trim().length > 0 && annForm.message.trim().length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ── Top navigation (brand + tabs + channels) ── */}
      <TopNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        schoolName={schoolName}
      />

      {/* ── Page header (title + actions) ── */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold text-slate-900">Communication Center</h1>
              <Badge className="shrink-0 border-slate-200 bg-slate-100 text-slate-600 text-xs hidden sm:inline-flex">
                {schoolName}
              </Badge>
            </div>
            <p className="hidden text-xs text-slate-500 sm:block">
              Write once, send everywhere — in-app · email · SMS · WhatsApp · social
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => submitCampaign("DRAFT")}
              disabled={campaignSaving}
              className="hidden sm:inline-flex"
            >
              <FileEdit className="mr-1.5 h-4 w-4" /> Save draft
            </Button>
            <Button
              size="sm"
              onClick={() => submitCampaign("SEND")}
              disabled={campaignSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Send campaign</span>
              <span className="sm:hidden">Send</span>
            </Button>
          </div>
        </div>
      </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Error banner */}
          {commError && (
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{commError}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchComm}
                  className="flex items-center gap-1 font-medium underline underline-offset-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
                <button onClick={() => setCommError("")}><X className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {/* Tab content */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="p-4 sm:p-5">

              {/* ── Announcements ── */}
              {activeTab === "announcements" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: <Send className="h-3.5 w-3.5" />, label: "Published", value: publishedCount },
                      { icon: <SquarePen className="h-3.5 w-3.5" />, label: "Drafts", value: draftCount },
                      { icon: <Pin className="h-3.5 w-3.5" />, label: "Pinned", value: pinnedCount },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">{icon} {label}</div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>

                  {annError && (
                    <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <span>{annError}</span>
                      <button onClick={() => setAnnError("")}><X className="h-4 w-4" /></button>
                    </div>
                  )}

                  <AnnouncementForm
                    values={annForm}
                    onChange={handleAnnFormChange}
                    onSubmit={handleCreateAnnouncement}
                    canSubmit={canSubmitAnn}
                    onAiDraft={handleAiDraft}
                  />
                  <AnnouncementFilters
                    searchQuery={searchQuery}
                    activeFilter={activeFilter}
                    onSearchChange={setSearchQuery}
                    onFilterChange={setActiveFilter}
                    totalCount={announcements.length}
                    pinnedCount={pinnedCount}
                  />
                  <AnnouncementList
                    announcements={annLoading ? [] : filteredAnnouncements}
                    onTogglePin={handleTogglePin}
                    onToggleStatus={handleToggleStatus}
                    onDelete={handleDeleteAnnouncement}
                  />
                </div>
              )}

              {/* ── Campaigns ── */}
              {activeTab === "campaigns" && (
                <div className="space-y-6">
                  {/* KPI row — campaigns only */}
                  <StatsRow stats={stats} loading={commLoading} />

                  {campaignError && (
                    <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <span>{campaignError}</span>
                      <button onClick={() => setCampaignError("")}><X className="h-4 w-4" /></button>
                    </div>
                  )}

                  {/* Create + Settings — two columns on xl */}
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {/* Create campaign */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-600" />
                        <h2 className="font-semibold text-slate-800">Create Campaign</h2>
                      </div>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                        placeholder="Campaign title *"
                        value={form.title}
                        onChange={(e) => setFormField("title", e.target.value)}
                      />
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                        placeholder="Internal note (not sent)"
                        value={form.internalNote}
                        onChange={(e) => setFormField("internalNote", e.target.value)}
                      />
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                        placeholder="Public caption | email subject"
                        value={form.publicCaption}
                        onChange={(e) => setFormField("publicCaption", e.target.value)}
                      />
                      <textarea
                        rows={4}
                        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                        placeholder="Message body *"
                        value={form.messageBody}
                        onChange={(e) => setFormField("messageBody", e.target.value)}
                      />
                      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-5 text-sm text-slate-400 cursor-pointer hover:border-blue-300 hover:text-blue-400 transition-colors">
                        <Image className="mr-2 h-4 w-4" /> Attach media (image, video, PDF)
                      </div>
                      {/* Summary chips */}
                      {(form.channels.length > 0 || form.audience !== "All" || form.priority !== "NORMAL") && (
                        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                          {form.channels.map((ch) => {
                            const meta = CHANNEL_META[ch];
                            return (
                              <span
                                key={ch}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1 text-xs font-medium text-white shadow-[0_3px_10px_rgba(59,130,246,0.35)]"
                              >
                                <span>{meta.renderIcon(true)}</span>
                                {meta.label}
                              </span>
                            );
                          })}
                          {form.audience !== "All" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600">
                              <Users className="h-3 w-3" /> {form.audience}
                            </span>
                          )}
                          {form.priority !== "NORMAL" && (
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${PRIORITY_COLOR[form.priority]}`}>
                              <Zap className="h-3 w-3" /> {form.priority}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Send settings */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                      <h2 className="font-semibold text-slate-800">Send Settings</h2>

                      {/* Channels */}
                      <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Channels</p>
                        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-3">
                          {/* Select All toggle */}
                          <button
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                channels: f.channels.length === ALL_CHANNEL_KEYS.length ? [] : [...ALL_CHANNEL_KEYS],
                              }))
                            }
                            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
                              form.channels.length === ALL_CHANNEL_KEYS.length
                                ? "border-blue-500 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)]"
                                : "border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
                            }`}
                          >
                            <Zap className="h-4 w-4 shrink-0" />
                            <span>All</span>
                          </button>
                          {ALL_CHANNELS.map(({ key, label }) => {
                            const meta = CHANNEL_META[key];
                            const active = form.channels.includes(key);
                            return (
                              <button
                                key={key}
                                onClick={() => toggleChannel(key)}
                                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                                  active
                                    ? "border-blue-500 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)]"
                                    : "border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
                                }`}
                              >
                                <span className="shrink-0 text-base leading-none">
                                  {meta.renderIcon(active)}
                                </span>
                                <span className="truncate">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Audience */}
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</p>
                        <div className="relative">
                          <select
                            className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm outline-none focus:border-blue-400"
                            value={form.audience}
                            onChange={(e) => setFormField("audience", e.target.value)}
                          >
                            {AUDIENCE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        </div>
                      </div>

                      {/* Priority */}
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Priority</p>
                        <div className="flex gap-2">
                          {(["LOW", "NORMAL", "HIGH"] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => setFormField("priority", p)}
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                form.priority === p
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-slate-200 text-slate-500 hover:border-slate-300"
                              }`}
                            >
                              {p.charAt(0) + p.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Schedule toggle */}
                      <label className="flex cursor-pointer items-center justify-between">
                        <span className="text-sm text-slate-700">Schedule for later</span>
                        <button
                          role="switch"
                          aria-checked={form.scheduleEnabled}
                          onClick={() => setFormField("scheduleEnabled", !form.scheduleEnabled)}
                          className={`relative h-5 w-9 rounded-full transition-colors ${form.scheduleEnabled ? "bg-blue-600" : "bg-slate-200"}`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.scheduleEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </label>
                      {form.scheduleEnabled && (
                        <input
                          type="datetime-local"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                          value={form.scheduledAt}
                          onChange={(e) => setFormField("scheduledAt", e.target.value)}
                        />
                      )}

                      {/* Approval toggle */}
                      <label className="flex cursor-pointer items-center justify-between">
                        <span className="text-sm text-slate-700">Require approval before send</span>
                        <button
                          role="switch"
                          aria-checked={form.approvalRequired}
                          onClick={() => setFormField("approvalRequired", !form.approvalRequired)}
                          className={`relative h-5 w-9 rounded-full transition-colors ${form.approvalRequired ? "bg-blue-600" : "bg-slate-200"}`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.approvalRequired ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </label>

                      {/* Quick actions */}
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => submitCampaign("DRAFT")}
                          disabled={campaignSaving}
                        >
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          Save draft
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => submitCampaign("SEND")}
                          disabled={campaignSaving}
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          {campaignSaving ? "Saving…" : "Send now"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Campaigns table */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">All Campaigns</h3>
                    <CampaignsTable
                      campaigns={campaigns}
                      loading={commLoading}
                      onDelete={handleDeleteCampaign}
                    />
                  </div>
                </div>
              )}

              {/* ── Calendar ── */}
              {activeTab === "calendar" && <CalendarTab campaigns={campaigns} />}

              {/* ── Templates ── */}
              {activeTab === "templates" && (
                <TemplatesTab
                  schoolId={schoolId}
                  templates={templates}
                  loading={templatesLoading}
                  onUseTemplate={handleUseTemplate}
                  onRefresh={fetchTemplates}
                />
              )}

            </div>
          </div>
        </main>
    </div>
  );
};

export default CommunicationCenterPage;
