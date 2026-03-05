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

  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: 1,
      title: "School Holiday Notice",
      message: "School will remain closed on Friday due to maintenance.",
      author: "Principal",
      date: "2026-03-05",
    },
    {
      id: 2,
      title: "Staff Meeting",
      message: "All teachers must attend the meeting at 3 PM in Room 101.",
      author: "Principal",
      date: "2026-03-04",
    },
  ]);

  const postAnnouncement = () => {
    if (!title || !message) return;

    const newAnnouncement: Announcement = {
      id: Date.now(),
      title,
      message,
      author: "Teacher",
      date: new Date().toLocaleDateString(),
    };

    setAnnouncements([newAnnouncement, ...announcements]);

    setTitle("");
    setMessage("");
  };

  return (
    <div className="space-y-6">

      {/* POST ANNOUNCEMENT */}

      <div className="stat-card p-6">

        <h3 className="text-lg font-semibold mb-4">
          Create Announcement
        </h3>

        <div className="space-y-4">

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
            className="bg-green-600 text-white px-5 py-2 rounded"
          >
            Post Announcement
          </button>

        </div>

      </div>

      {/* ANNOUNCEMENTS LIST */}

      <div className="stat-card p-6">

        <h3 className="text-lg font-semibold mb-4">
          Announcements
        </h3>

        <div className="space-y-4">

          {announcements.map((a) => (
            <div
              key={a.id}
              className="bg-gray-50 border rounded-xl p-4"
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

            </div>
          ))}

        </div>

      </div>

    </div>
  );
}