import { useState } from "react";

type Announcement = {
  id: number;
  title: string;
  message: string;
  author: string;
  date: string;
};

export default function CommunicationModule() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");

  // Change role here
  const userRole = "Principal"; // or "Teacher"

  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: 1,
      title: "School Holiday Notice",
      message: "School will remain closed on Friday due to maintenance.",
      author: "Principal",
      date: "05 Mar 2026",
    },
    {
      id: 2,
      title: "Staff Meeting",
      message: "All teachers must attend meeting at 3 PM.",
      author: "Principal",
      date: "04 Mar 2026",
    },
  ]);

  const postAnnouncement = () => {
    if (!title.trim() || !message.trim()) {
      alert("Please fill all fields");
      return;
    }

    const newAnnouncement: Announcement = {
      id: Date.now(),
      title,
      message,
      author: userRole,
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    setAnnouncements([newAnnouncement, ...announcements]);
    setTitle("");
    setMessage("");

    setSuccess("✅ Announcement posted successfully!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const deleteAnnouncement = (id: number) => {
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  const filteredAnnouncements = announcements.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* CREATE ANNOUNCEMENT (Principal only) */}
      {userRole === "Principal" && (
        <div className="stat-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            Create Announcement
          </h3>

          <div className="space-y-4">

            {success && (
              <p className="text-green-600 text-sm">{success}</p>
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

      {/* ANNOUNCEMENTS LIST */}
      <div className="stat-card p-6">
        <h3 className="text-lg font-semibold mb-4">
          Announcements
        </h3>

        {filteredAnnouncements.length === 0 ? (
          <p className="text-sm text-gray-500">
            No announcements found.
          </p>
        ) : (
          <div className="space-y-4">

            {filteredAnnouncements.map((a, index) => (
              <div
                key={a.id}
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
                    {a.date}
                  </span>

                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Posted by: {a.author}
                </p>

                {/* DELETE (Principal only) */}
                {userRole === "Principal" && (
                  <button
                    onClick={() => deleteAnnouncement(a.id)}
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