import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone } from "lucide-react";
import {
  AUDIENCE_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  type AnnouncementAudience,
  type AnnouncementFormValues,
  type AnnouncementPriority,
  type AnnouncementStatus,
} from "./types";

type AnnouncementFormProps = {
  values: AnnouncementFormValues;
  onChange: <K extends keyof AnnouncementFormValues>(field: K, value: AnnouncementFormValues[K]) => void;
  onSubmit: () => void;
  canSubmit: boolean;
};

export default function AnnouncementForm({
  values,
  onChange,
  onSubmit,
  canSubmit,
}: AnnouncementFormProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg text-slate-900">Create announcement</CardTitle>
            <CardDescription>
              Draft updates quickly and publish them when the message is ready.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="announcement-title">
              Title
            </label>
            <Input
              id="announcement-title"
              value={values.title}
              onChange={(event) => onChange("title", event.target.value)}
              placeholder="Enter a clear announcement title"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="announcement-message">
              Message
            </label>
            <Textarea
              id="announcement-message"
              value={values.message}
              onChange={(event) => onChange("message", event.target.value)}
              placeholder="Write the announcement details for your school community"
              className="min-h-[132px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Audience</label>
            <Select
              value={values.audience}
              onValueChange={(value) => onChange("audience", value as AnnouncementAudience)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((audience) => (
                  <SelectItem key={audience} value={audience}>
                    {audience}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Priority</label>
            <Select
              value={values.priority}
              onValueChange={(value) => onChange("priority", value as AnnouncementPriority)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Status</label>
            <Select
              value={values.status}
              onValueChange={(value) => onChange("status", value as AnnouncementStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="announcement-publish-date">
              Publish date
            </label>
            <Input
              id="announcement-publish-date"
              type="date"
              value={values.publishDate}
              onChange={(event) => onChange("publishDate", event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <Checkbox
              checked={values.isPinned}
              onCheckedChange={(checked) => onChange("isPinned", Boolean(checked))}
              className="mt-0.5"
            />
            <span>
              <span className="block font-medium text-slate-900">Pin announcement</span>
              <span className="block text-xs text-slate-500">
                Pinned items stay at the top of the announcement list.
              </span>
            </span>
          </label>

          <Button type="button" onClick={onSubmit} disabled={!canSubmit} className="sm:min-w-[180px]">
            {values.status === "Published" ? "Publish announcement" : "Save draft"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
