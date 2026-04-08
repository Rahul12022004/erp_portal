import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarDays, Pin, PinOff, Trash2 } from "lucide-react";
import type { AnnouncementItem } from "./types";

type AnnouncementCardProps = {
  announcement: AnnouncementItem;
  onTogglePin: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
};

const audienceBadgeClassNames: Record<AnnouncementItem["audience"], string> = {
  All: "border-slate-200 bg-slate-50 text-slate-700",
  Students: "border-sky-200 bg-sky-50 text-sky-700",
  Teachers: "border-violet-200 bg-violet-50 text-violet-700",
  Parents: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Staff: "border-amber-200 bg-amber-50 text-amber-700",
};

const priorityBadgeClassNames: Record<AnnouncementItem["priority"], string> = {
  Normal: "border-slate-200 bg-slate-50 text-slate-700",
  Important: "border-orange-200 bg-orange-50 text-orange-700",
  Urgent: "border-rose-200 bg-rose-50 text-rose-700",
};

const statusBadgeClassNames: Record<AnnouncementItem["status"], string> = {
  Draft: "border-dashed border-slate-300 bg-slate-100 text-slate-700",
  Published: "border-emerald-200 bg-emerald-100 text-emerald-700",
};

const getMessagePreview = (message: string) =>
  message.length > 170 ? `${message.slice(0, 167)}...` : message;

export default function AnnouncementCard({
  announcement,
  onTogglePin,
  onToggleStatus,
  onDelete,
}: AnnouncementCardProps) {
  return (
    <Card
      className={cn(
        "border-slate-200 shadow-sm",
        announcement.isPinned && "border-blue-200 bg-blue-50/40",
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {announcement.isPinned && (
                <Badge className="border-blue-200 bg-blue-100 text-blue-700">
                  <Pin className="mr-1 h-3 w-3" />
                  Pinned
                </Badge>
              )}
              <Badge className={audienceBadgeClassNames[announcement.audience]}>
                {announcement.audience}
              </Badge>
              <Badge className={priorityBadgeClassNames[announcement.priority]}>
                {announcement.priority}
              </Badge>
              <Badge className={statusBadgeClassNames[announcement.status]}>
                {announcement.status}
              </Badge>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">{announcement.title}</h3>
              <p className="text-sm leading-6 text-slate-600">
                {getMessagePreview(announcement.message)}
              </p>
            </div>
          </div>

          <div className="flex min-w-fit flex-col items-start gap-3 lg:items-end">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(announcement.publishDate).toLocaleDateString()}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onTogglePin(announcement.id)}
              >
                {announcement.isPinned ? (
                  <>
                    <PinOff className="h-4 w-4" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4" />
                    Pin
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant={announcement.status === "Published" ? "secondary" : "default"}
                size="sm"
                onClick={() => onToggleStatus(announcement.id)}
              >
                {announcement.status === "Published" ? "Move to Draft" : "Publish"}
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onDelete(announcement.id)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
