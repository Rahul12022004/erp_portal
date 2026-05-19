import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduledCampaign {
  id: string;
  title: string;
  scheduledAt?: string;
  channels: { channel: string }[];
  audienceLabel: string;
}

interface CalendarTabProps {
  campaigns: ScheduledCampaign[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarTab({ campaigns }: CalendarTabProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const scheduled = campaigns.filter((c) => c.scheduledAt);

  const campaignsByDate = scheduled.reduce<Record<string, ScheduledCampaign[]>>((acc, c) => {
    const d = new Date(c.scheduledAt!);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const key = d.getDate().toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
    }
    return acc;
  }, {});

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const selectedCampaigns = selected ? (campaignsByDate[selected] ?? []) : [];

  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-16 bg-slate-50/50" />;
            }
            const isToday =
              day === today.getDate() &&
              viewMonth === today.getMonth() &&
              viewYear === today.getFullYear();
            const dayCampaigns = campaignsByDate[day.toString()] ?? [];
            const isSelected = selected === day.toString();

            return (
              <button
                key={day}
                onClick={() => setSelected(isSelected ? null : day.toString())}
                className={`relative h-16 p-1.5 text-left transition-colors hover:bg-blue-50/60 ${
                  isSelected ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : ""
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday ? "bg-blue-600 text-white" : "text-slate-700"
                  }`}
                >
                  {day}
                </span>
                {dayCampaigns.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {dayCampaigns.slice(0, 2).map((c) => (
                      <span
                        key={c.id}
                        className="block truncate rounded bg-blue-100 px-1 text-[10px] text-blue-700 max-w-full"
                      >
                        {c.title}
                      </span>
                    ))}
                    {dayCampaigns.length > 2 && (
                      <span className="text-[10px] text-slate-400">
                        +{dayCampaigns.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selected && selectedCampaigns.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            {MONTHS[viewMonth]} {selected}, {viewYear} — {selectedCampaigns.length} campaign{selectedCampaigns.length !== 1 ? "s" : ""}
          </p>
          {selectedCampaigns.map((c) => (
            <div key={c.id} className="rounded-lg border border-blue-200 bg-white p-3 text-sm">
              <p className="font-medium text-slate-800">{c.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {c.audienceLabel} · {c.channels.map((ch) => ch.channel).join(", ") || "No channels"}
              </p>
            </div>
          ))}
        </div>
      )}

      {selected && selectedCampaigns.length === 0 && (
        <p className="text-sm text-slate-400 text-center">No campaigns scheduled on this day.</p>
      )}

      {scheduled.length === 0 && (
        <p className="text-center text-sm text-slate-400">
          No scheduled campaigns. Create a campaign and set a schedule date to see it here.
        </p>
      )}
    </div>
  );
}
