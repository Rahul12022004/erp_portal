import { useEffect, useState } from "react";

type Announcement = {
  _id: string;
  title: string;
  message: string;
  author: string;
  createdAt: string;
};

export default function CommunicationModule() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const school = JSON.parse(localStorage.getItem("school") || "null");
  const teacher = JSON.parse(localStorage.getItem("teacher") || "null");
  const teacherName = teacher?.name || "Teacher";

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
        `http://localhost:5000/api/announcements/${school._id}`
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

      const res = await fetch("http://localhost:5000/api/announcements", {
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

  const deleteAnnouncement = async (id: string) => {
    try {
      setError("");
      const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
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

                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(announcement.createdAt).toLocaleString()}
                    </span>
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
