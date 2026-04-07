import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Announcement = {
  _id: string;
  title: string;
  message: string;
  author: string;
  createdAt: string;
};

const getDismissedAnnouncementsKey = (schoolId: string) =>
  `teacher-dismissed-announcements:${schoolId}`;

const loadDismissedAnnouncementIds = (schoolId: string): string[] => {
  if (!schoolId) return [];

  try {
    const raw = localStorage.getItem(getDismissedAnnouncementsKey(schoolId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const saveDismissedAnnouncementIds = (schoolId: string, ids: string[]) => {
  if (!schoolId) return;
  localStorage.setItem(getDismissedAnnouncementsKey(schoolId), JSON.stringify(ids));
};

export default function CommunicationModule() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<string[]>([]);

  const school = JSON.parse(localStorage.getItem("school") || "null");
  const teacher = JSON.parse(localStorage.getItem("teacher") || "null");
  const teacherName = teacher?.name || "Teacher";
  const schoolId = school?._id ? String(school._id) : "";

  const fetchAnnouncements = async () => {
    if (!school?._id) {
      setError("School not found. Please log in again.");
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `/api/announcements/${school._id}`
      );

      if (!res.ok) {
        throw new Error(`Failed to load announcements (${res.status})`);
      }

      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Teacher announcements fetch error:", err);
      setAnnouncements([]);
      setError(err instanceof Error ? err.message : "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    setDismissedAnnouncementIds(loadDismissedAnnouncementIds(schoolId));
  }, [schoolId]);

  const handleDismissAnnouncement = (announcementId: string) => {
    setDismissedAnnouncementIds((current) => {
      const next = current.includes(announcementId) ? current : [...current, announcementId];
      saveDismissedAnnouncementIds(schoolId, next);
      return next;
    });
  };

  const postAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      alert("Please fill all fields");
      return;
    }

    if (!school?._id) {
      alert("School not found. Please log in again.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          author: teacherName,
          schoolId: school._id,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to post announcement");
      }

      setAnnouncements((current) => [data.data, ...current]);
      setTitle("");
      setMessage("");
      setSuccess("Announcement posted successfully.");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post announcement");
    } finally {
      setSaving(false);
    }
  };

  const createWithAi = async () => {
    if (!aiTopic.trim()) {
      setError("Please enter a topic for AI draft generation.");
      return;
    }

    try {
      setAiLoading(true);
      setError("");

      const res = await fetch("/api/announcements/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          description: aiDescription.trim(),
          author: teacherName,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to generate AI announcement");
      }

      setTitle(data.data?.title || "");
      setMessage(data.data?.message || "");
      setAiOpen(false);
      setSuccess("AI draft generated. Review and post.");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate AI draft");
    } finally {
      setAiLoading(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      setError("");
      const res = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.message || "Failed to delete announcement");
      }

      setAnnouncements((current) => current.filter((item) => item._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete announcement");
    }
  };

  const filteredAnnouncements = announcements.filter((announcement) => {
    if (dismissedAnnouncementIds.includes(announcement._id)) {
      return false;
    }

    const query = search.toLowerCase();
    return (
      announcement.title.toLowerCase().includes(query) ||
      announcement.message.toLowerCase().includes(query) ||
      announcement.author.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="stat-card p-6">
        <h3 className="text-lg font-semibold mb-2">Teacher Communication</h3>
        <p className="text-sm text-muted-foreground">
          Share updates with your school and keep track of recent announcements in one place.
        </p>
      </div>

      <div className="stat-card p-6">
        <h3 className="text-lg font-semibold mb-4">Create Announcement</h3>

        <div className="space-y-4">
          {success && <p className="text-green-600 text-sm">{success}</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <input
            type="text"
            placeholder="Announcement Title"
            className="border rounded p-2 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            placeholder="Write announcement..."
            className="border rounded p-2 w-full"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="relative flex justify-end">
            <button
              type="button"
              aria-label="Open AI draft popup"
              onClick={() => setAiOpen((prev) => !prev)}
              className="w-8 h-8 rounded-full border border-blue-300 text-blue-700 text-xs font-semibold hover:bg-blue-50"
            >
              AI
            </button>

            {aiOpen && (
              <div className="absolute right-0 top-10 z-10 w-72 rounded-lg border bg-white shadow-lg p-3 space-y-2">
                <p className="text-sm font-medium text-gray-700">Create with AI</p>
                <input
                  type="text"
                  placeholder="Topic"
                  className="border rounded p-2 w-full"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                />
                <textarea
                  placeholder="Description"
                  rows={3}
                  className="border rounded p-2 w-full"
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAiOpen(false)}
                    className="px-3 py-1 rounded border text-sm"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={createWithAi}
                    disabled={aiLoading || saving}
                    className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
                  >
                    {aiLoading ? "Generating..." : "Generate"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={postAnnouncement}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded"
            disabled={saving}
          >
            {saving ? "Posting..." : "Post Announcement"}
          </button>
        </div>
      </div>

      <input
        placeholder="Search announcements..."
        className="border p-2 w-full rounded"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="stat-card p-6">
        <h3 className="text-lg font-semibold mb-4">Announcements</h3>

        {loading ? (
          <p className="text-sm text-gray-500">Loading announcements...</p>
        ) : filteredAnnouncements.length === 0 ? (
          <p className="text-sm text-gray-500">No announcements found.</p>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement, index) => {
              const isOwnPost = announcement.author === teacherName;

              return (
                <div
                  key={announcement._id}
                  className={`border rounded-xl p-4 ${
                    index === 0 ? "bg-green-50 border-green-400" : "bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {announcement.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {announcement.message}
                      </p>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap pt-1">
                        {new Date(announcement.createdAt).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDismissAnnouncement(announcement._id)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Dismiss announcement"
                        title="Dismiss announcement"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-4">
                    <p className="text-xs text-gray-500">
                      Posted by: {announcement.author}
                    </p>

                    {isOwnPost && (
                      <button
                        onClick={() => deleteAnnouncement(announcement._id)}
                        className="text-red-500 text-xs"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
