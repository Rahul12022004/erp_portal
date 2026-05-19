import { Card, CardContent } from "@/components/ui/card";
import { Inbox } from "lucide-react";
import AnnouncementCard from "./AnnouncementCard";
import type { AnnouncementItem } from "./types";

type AnnouncementListProps = {
  announcements: AnnouncementItem[];
  onTogglePin: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function AnnouncementList({
  announcements,
  onTogglePin,
  onToggleStatus,
  onDelete,
}: AnnouncementListProps) {
  if (announcements.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 bg-slate-50/60 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">No announcements found</h3>
            <p className="max-w-md text-sm text-slate-500">
              Try a different search or filter, or create a new announcement to start the communication feed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          onTogglePin={onTogglePin}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
