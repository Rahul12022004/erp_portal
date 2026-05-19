import { useState } from "react";
import { FileText, Plus, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface MessageTemplate {
  _id: string;
  name: string;
  subject?: string;
  body: string;
  category: string;
}

interface TemplatesTabProps {
  schoolId: string;
  templates: MessageTemplate[];
  loading: boolean;
  onUseTemplate: (subject: string, body: string) => void;
  onRefresh: () => void;
}

interface TemplateFormState {
  name: string;
  subject: string;
  body: string;
  category: string;
}

const defaultForm = (): TemplateFormState => ({
  name: "",
  subject: "",
  body: "",
  category: "General",
});

export default function TemplatesTab({
  schoolId,
  templates,
  loading,
  onUseTemplate,
  onRefresh,
}: TemplatesTabProps) {
  const [form, setForm] = useState<TemplateFormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!form.name.trim() || !form.body.trim()) return;
    try {
      setSaving(true);
      setError("");
      const res = await fetch("/api/communication/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message ?? "Failed to save template");
      setForm(defaultForm());
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/communication/templates/${id}`, { method: "DELETE" });
      onRefresh();
    } catch {
      // silently ignore
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-base text-slate-800">New Template</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 sm:p-5">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Template name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="Category (e.g. Fees, Events)"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <Input
            placeholder="Subject / Email title"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          />
          <Textarea
            rows={4}
            placeholder="Message body *"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={saving || !form.name.trim() || !form.body.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {saving ? "Saving…" : "Save template"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
          No templates yet. Create one above to reuse messages across campaigns and announcements.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t._id} className="border-slate-200 shadow-sm">
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                    <p className="font-medium text-slate-800 truncate">{t.name}</p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {t.category}
                    </span>
                  </div>
                  {t.subject && (
                    <p className="text-xs text-slate-500 truncate">Subject: {t.subject}</p>
                  )}
                  <p className="text-sm text-slate-600 line-clamp-2">{t.body}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUseTemplate(t.subject ?? t.name, t.body)}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Use
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(t._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
