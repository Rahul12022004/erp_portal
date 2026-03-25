import { useState, useEffect } from "react";

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
  const [aiTopic, setAiTopic] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const school = JSON.parse(localStorage.getItem("school") || "{}");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = currentUser?.role || "Principal";

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
        `https://erp-portal-1-ftwe.onrender.com/api/announcements/${school._id}`
      );

      if (!res.ok) {
        throw new Error(`Failed to load announcements (${res.status})`);
      }

      const data = await res.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setAnnouncements([]);
      setError(err instanceof Error ? err.message : "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FETCH ANNOUNCEMENTS
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // ✅ POST
  const postAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      alert("Please fill all fields");
      return;
    }

    try {
      setError("");
      const res = await fetch("https://erp-portal-1-ftwe.onrender.com/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          author: userRole,
          schoolId: school?._id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to post announcement");
      }

      if (data.success) {
        setAnnouncements((current) => [data.data, ...current]);
        setTitle("");
        setMessage("");
        setSuccess("Announcement posted successfully.");
        setTimeout(() => setSuccess(""), 2000);
      } else {
        throw new Error(data.message || "Failed to post announcement");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error posting announcement");
    }
  };

  const createWithAi = async () => {
    if (!aiTopic.trim()) {
      setError("Please enter a topic for AI draft generation.");
      return;
    }

    try {
      setError("");
      setAiLoading(true);

      const res = await fetch("https://erp-portal-1-ftwe.onrender.com/api/announcements/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          description: aiDescription.trim(),
          author: userRole,
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

  // ✅ DELETE
  const deleteAnnouncement = async (id: string) => {
    try {
      setError("");
      const res = await fetch(
        `https://erp-portal-1-ftwe.onrender.com/api/announcements/${id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        throw new Error("Failed to delete announcement");
      }

      setAnnouncements((current) => current.filter((a) => a._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete announcement");
    }
  };

  // ✅ SEARCH FILTER
  const filteredAnnouncements = announcements.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* CREATE */}
      {userRole === "Principal" && (
        <div className="stat-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            Create Announcement
          </h3>

          <div className="space-y-4">
            {success && (
              <p className="text-green-600 text-sm">{success}</p>
            )}
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

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
                      disabled={aiLoading}
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
            >
              Post Announcement
            </button>
          </div>
        </div>
      )}

      {/* SEARCH */}
      <input
        placeholder="Search announcements..."
        className="border p-2 w-full rounded"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* LIST */}
      <div className="stat-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          Announcements
        </h3>

        {error && !success ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="text-sm text-gray-500">Loading announcements...</p>
        ) : filteredAnnouncements.length === 0 ? (
          <p className="text-sm text-gray-500">
            No announcements found.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((a, index) => (
              <div
                key={a._id}
                className={`border rounded-xl p-4 ${
                  index === 0
                    ? "bg-green-50 border-green-400"
                    : "bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {a.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {a.message}
                    </p>
                  </div>

                  <span className="text-xs text-gray-500">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Posted by: {a.author}
                </p>

                {userRole === "Principal" && (
                  <button
                    onClick={() => deleteAnnouncement(a._id)}
                    className="text-red-500 text-xs mt-2"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
