import { useState, FormEvent } from "react";

interface SportEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
}

export default function SportsModule() {
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [form, setForm] = useState<Omit<SportEvent, "id">>({
    name: "",
    date: "",
    location: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setEvents([
        ...events,
        { ...form, id: Date.now().toString() },
      ]);
      setForm({ name: "", date: "", location: "", description: "" });
      setSaving(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Add Sport Event</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Event Name"
          value={form.name}
          onChange={handleChange}
          className="border rounded p-2 w-full"
          required
        />
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          className="border rounded p-2 w-full"
          required
        />
        <input
          type="text"
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={handleChange}
          className="border rounded p-2 w-full"
          required
        />
        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          className="border rounded p-2 w-full"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={saving}
        >
          {saving ? "Saving..." : "Add Event"}
        </button>
      </form>
      <div>
        <h3 className="font-semibold mb-2">Events</h3>
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id} className="border rounded p-3">
              <div className="font-bold">{event.name}</div>
              <div>Date: {event.date}</div>
              <div>Location: {event.location}</div>
              <div>{event.description}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
