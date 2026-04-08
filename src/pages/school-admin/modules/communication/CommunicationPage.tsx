import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { readStoredRoleUser, readStoredSchoolSession } from "@/lib/auth";
import { Pin, Send, SquarePen } from "lucide-react";
import AnnouncementFilters from "./AnnouncementFilters";
import AnnouncementForm from "./AnnouncementForm";
import AnnouncementList from "./AnnouncementList";
import {
  createDefaultAnnouncementForm,
  type AnnouncementAudience,
  type AnnouncementFilter,
  type AnnouncementFormValues,
  type AnnouncementItem,
  type AnnouncementPriority,
} from "./types";

type BackendAnnouncement = {
  _id: string;
  title: string;
  message: string;
  author: string;
  createdAt: string;
};

type AnnouncementMetaRecord = {
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  publishDate: string;
  isPinned: boolean;
};

const getAnnouncementMetaKey = (schoolId: string) => `school-communication-meta:${schoolId}`;
const getDraftAnnouncementsKey = (schoolId: string) => `school-communication-drafts:${schoolId}`;

function createAnnouncementId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `announcement-${Date.now()}`;
}

function createDraftAnnouncementId() {
  return `draft-${createAnnouncementId()}`;
}

function sortAnnouncements(announcements: AnnouncementItem[]) {
  return [...announcements].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return Number(right.isPinned) - Number(left.isPinned);
    }

    return new Date(right.publishDate).getTime() - new Date(left.publishDate).getTime();
  });
}

function isDraftAnnouncement(id: string) {
  return id.startsWith("draft-");
}

function loadAnnouncementMeta(schoolId: string): Record<string, AnnouncementMetaRecord> {
  if (!schoolId) return {};

  try {
    const raw = localStorage.getItem(getAnnouncementMetaKey(schoolId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, AnnouncementMetaRecord> : {};
  } catch {
    return {};
  }
}

function saveAnnouncementMeta(schoolId: string, value: Record<string, AnnouncementMetaRecord>) {
  if (!schoolId) return;
  localStorage.setItem(getAnnouncementMetaKey(schoolId), JSON.stringify(value));
}

function loadDraftAnnouncements(schoolId: string): AnnouncementItem[] {
  if (!schoolId) return [];

  try {
    const raw = localStorage.getItem(getDraftAnnouncementsKey(schoolId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as AnnouncementItem[] : [];
  } catch {
    return [];
  }
}

function saveDraftAnnouncements(schoolId: string, value: AnnouncementItem[]) {
  if (!schoolId) return;
  localStorage.setItem(getDraftAnnouncementsKey(schoolId), JSON.stringify(value));
}

function mapBackendAnnouncement(
  announcement: BackendAnnouncement,
  meta: Record<string, AnnouncementMetaRecord>,
): AnnouncementItem {
  const savedMeta = meta[announcement._id];

  return {
    id: announcement._id,
    title: announcement.title,
    message: announcement.message,
    audience: savedMeta?.audience || "All",
    priority: savedMeta?.priority || "Normal",
    status: "Published",
    publishDate: savedMeta?.publishDate || new Date(announcement.createdAt).toISOString().slice(0, 10),
    isPinned: savedMeta?.isPinned || false,
    createdAt: announcement.createdAt,
  };
}

function createMetaFromAnnouncement(announcement: AnnouncementItem): AnnouncementMetaRecord {
  return {
    audience: announcement.audience,
    priority: announcement.priority,
    publishDate: announcement.publishDate,
    isPinned: announcement.isPinned,
  };
}

function dispatchAnnouncementsUpdated() {
  window.dispatchEvent(new Event("announcements-updated"));
}

export default function CommunicationPage() {
  const school = readStoredSchoolSession();
  const currentUser = readStoredRoleUser();
  const schoolId = school?._id ? String(school._id) : "";
  const authorName = currentUser?.name || school?.adminInfo?.name || "School Administration";

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [formValues, setFormValues] = useState<AnnouncementFormValues>(createDefaultAnnouncementForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<AnnouncementFilter>("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAnnouncements = async () => {
    if (!schoolId) {
      setAnnouncements([]);
      setError("School not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [response, draftAnnouncements] = await Promise.all([
        fetch(`/api/announcements/${schoolId}`),
        Promise.resolve(loadDraftAnnouncements(schoolId)),
      ]);

      if (!response.ok) {
        throw new Error(`Failed to load announcements (${response.status})`);
      }

      const data = await response.json().catch(() => []);
      const meta = loadAnnouncementMeta(schoolId);
      const publishedAnnouncements = Array.isArray(data)
        ? data.map((item) => mapBackendAnnouncement(item as BackendAnnouncement, meta))
        : [];

      setAnnouncements(sortAnnouncements([...publishedAnnouncements, ...draftAnnouncements]));
    } catch (err) {
      setAnnouncements(sortAnnouncements(loadDraftAnnouncements(schoolId)));
      setError(err instanceof Error ? err.message : "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const handleAnnouncementsUpdated = () => {
      fetchAnnouncements();
    };

    window.addEventListener("announcements-updated", handleAnnouncementsUpdated);
    return () => window.removeEventListener("announcements-updated", handleAnnouncementsUpdated);
  }, [schoolId]);

  const handleFormChange = <K extends keyof AnnouncementFormValues>(
    field: K,
    value: AnnouncementFormValues[K],
  ) => {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreateAnnouncement = async () => {
    if (!formValues.title.trim() || !formValues.message.trim()) {
      return;
    }

    if (!schoolId) {
      setError("School not found. Please log in again.");
      return;
    }

    const announcementBase: AnnouncementItem = {
      id: createAnnouncementId(),
      title: formValues.title.trim(),
      message: formValues.message.trim(),
      audience: formValues.audience,
      priority: formValues.priority,
      status: formValues.status,
      publishDate: formValues.publishDate,
      isPinned: formValues.isPinned,
      createdAt: new Date().toISOString(),
    };

    try {
      setSaving(true);
      setError("");

      if (formValues.status === "Draft") {
        const draftAnnouncement = {
          ...announcementBase,
          id: createDraftAnnouncementId(),
          status: "Draft" as const,
        };

        const nextDrafts = sortAnnouncements([...loadDraftAnnouncements(schoolId), draftAnnouncement]);
        saveDraftAnnouncements(schoolId, nextDrafts);
        setAnnouncements((current) => sortAnnouncements([...current, draftAnnouncement]));
      } else {
        const response = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: announcementBase.title,
            message: announcementBase.message,
            author: authorName,
            schoolId,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success || !data?.data?._id) {
          throw new Error(data?.message || "Failed to create announcement");
        }

        const meta = loadAnnouncementMeta(schoolId);
        meta[String(data.data._id)] = createMetaFromAnnouncement({
          ...announcementBase,
          id: String(data.data._id),
          status: "Published",
        });
        saveAnnouncementMeta(schoolId, meta);

        const createdAnnouncement = mapBackendAnnouncement(data.data as BackendAnnouncement, meta);
        setAnnouncements((current) => sortAnnouncements([createdAnnouncement, ...current]));
        dispatchAnnouncementsUpdated();
      }

      setFormValues(createDefaultAnnouncementForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = (id: string) => {
    if (!schoolId) return;

    setAnnouncements((current) => {
      const nextAnnouncements = sortAnnouncements(
        current.map((announcement) =>
          announcement.id === id
            ? { ...announcement, isPinned: !announcement.isPinned }
            : announcement,
        ),
      );

      if (isDraftAnnouncement(id)) {
        const nextDrafts = nextAnnouncements.filter((announcement) => isDraftAnnouncement(announcement.id));
        saveDraftAnnouncements(schoolId, nextDrafts);
      } else {
        const updatedAnnouncement = nextAnnouncements.find((announcement) => announcement.id === id);
        if (updatedAnnouncement) {
          const meta = loadAnnouncementMeta(schoolId);
          meta[id] = createMetaFromAnnouncement(updatedAnnouncement);
          saveAnnouncementMeta(schoolId, meta);
        }
      }

      return nextAnnouncements;
    });
  };

  const handleToggleStatus = async (id: string) => {
    if (!schoolId) return;

    const selectedAnnouncement = announcements.find((announcement) => announcement.id === id);
    if (!selectedAnnouncement) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (isDraftAnnouncement(id)) {
        const response = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: selectedAnnouncement.title,
            message: selectedAnnouncement.message,
            author: authorName,
            schoolId,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success || !data?.data?._id) {
          throw new Error(data?.message || "Failed to publish announcement");
        }

        const remainingDrafts = loadDraftAnnouncements(schoolId).filter((announcement) => announcement.id !== id);
        saveDraftAnnouncements(schoolId, remainingDrafts);

        const meta = loadAnnouncementMeta(schoolId);
        meta[String(data.data._id)] = createMetaFromAnnouncement({
          ...selectedAnnouncement,
          id: String(data.data._id),
          status: "Published",
        });
        saveAnnouncementMeta(schoolId, meta);

        const publishedAnnouncement = mapBackendAnnouncement(data.data as BackendAnnouncement, meta);
        setAnnouncements((current) =>
          sortAnnouncements([
            publishedAnnouncement,
            ...current.filter((announcement) => announcement.id !== id),
          ]),
        );
        dispatchAnnouncementsUpdated();
        return;
      }

      const response = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        throw new Error(data?.message || "Failed to move announcement to draft");
      }

      const meta = loadAnnouncementMeta(schoolId);
      delete meta[id];
      saveAnnouncementMeta(schoolId, meta);

      const draftAnnouncement: AnnouncementItem = {
        ...selectedAnnouncement,
        id: createDraftAnnouncementId(),
        status: "Draft",
      };

      const nextDrafts = sortAnnouncements([...loadDraftAnnouncements(schoolId), draftAnnouncement]);
      saveDraftAnnouncements(schoolId, nextDrafts);

      setAnnouncements((current) =>
        sortAnnouncements([
          draftAnnouncement,
          ...current.filter((announcement) => announcement.id !== id),
        ]),
      );
      dispatchAnnouncementsUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!schoolId) return;

    try {
      setSaving(true);
      setError("");

      if (isDraftAnnouncement(id)) {
        const remainingDrafts = loadDraftAnnouncements(schoolId).filter((announcement) => announcement.id !== id);
        saveDraftAnnouncements(schoolId, remainingDrafts);
        setAnnouncements((current) => current.filter((announcement) => announcement.id !== id));
        return;
      }

      const response = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.success === false)) {
        throw new Error(data?.message || "Failed to delete announcement");
      }

      const meta = loadAnnouncementMeta(schoolId);
      delete meta[id];
      saveAnnouncementMeta(schoolId, meta);

      setAnnouncements((current) => current.filter((announcement) => announcement.id !== id));
      dispatchAnnouncementsUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete announcement");
    } finally {
      setSaving(false);
    }
  };

  const filteredAnnouncements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return sortAnnouncements(announcements).filter((announcement) => {
      const matchesSearch =
        !query ||
        announcement.title.toLowerCase().includes(query) ||
        announcement.message.toLowerCase().includes(query);

      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Pinned" && announcement.isPinned) ||
        (activeFilter === "Draft" && announcement.status === "Draft") ||
        (activeFilter === "Published" && announcement.status === "Published");

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, announcements, searchQuery]);

  const publishedCount = announcements.filter((announcement) => announcement.status === "Published").length;
  const draftCount = announcements.filter((announcement) => announcement.status === "Draft").length;
  const pinnedCount = announcements.filter((announcement) => announcement.isPinned).length;
  const canSubmitAnnouncement =
    !saving &&
    formValues.title.trim().length > 0 &&
    formValues.message.trim().length > 0;

  return (
    <div className="space-y-6">
      <section className="stat-card overflow-hidden border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <Badge className="border-white/20 bg-white/10 text-white">CommunicationPage</Badge>
            <h2 className="text-2xl font-semibold tracking-tight">School communication dashboard</h2>
            <p className="text-sm text-slate-200">
              Create announcements, review drafts, pin important updates, and keep communication workflows
              simple for school administrators.
            </p>
            {error && <p className="text-sm text-red-200">{error}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                <Send className="h-3.5 w-3.5" />
                Published
              </div>
              <p className="mt-2 text-2xl font-semibold">{publishedCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                <SquarePen className="h-3.5 w-3.5" />
                Drafts
              </div>
              <p className="mt-2 text-2xl font-semibold">{draftCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                <Pin className="h-3.5 w-3.5" />
                Pinned
              </div>
              <p className="mt-2 text-2xl font-semibold">{pinnedCount}</p>
            </div>
          </div>
        </div>
      </section>

      <AnnouncementForm
        values={formValues}
        onChange={handleFormChange}
        onSubmit={handleCreateAnnouncement}
        canSubmit={canSubmitAnnouncement}
      />

      <AnnouncementFilters
        searchQuery={searchQuery}
        activeFilter={activeFilter}
        onSearchChange={setSearchQuery}
        onFilterChange={setActiveFilter}
        totalCount={announcements.length}
        pinnedCount={pinnedCount}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">AnnouncementList</h3>
            <p className="text-sm text-slate-500">
              Pinned announcements appear first. Published items also show on the dashboard feed.
            </p>
          </div>

          <Badge className="border-slate-200 bg-slate-50 text-slate-700">
            {loading ? "Loading..." : `${filteredAnnouncements.length} visible`}
          </Badge>
        </div>

        <AnnouncementList
          announcements={loading ? [] : filteredAnnouncements}
          onTogglePin={handleTogglePin}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteAnnouncement}
        />
      </section>
    </div>
  );
}
