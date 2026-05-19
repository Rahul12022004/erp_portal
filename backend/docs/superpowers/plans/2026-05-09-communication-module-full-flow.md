# Communication Module Full Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix "Failed to load communication data" error and wire the complete communication module — campaigns CRUD, stats, AI draft button, templates tab, and calendar tab.

**Architecture:** Add `communicationRoutes.ts` for stats/campaigns/templates endpoints backed by two new Mongoose models (`Campaign`, `MessageTemplate`). Register the route in `server.ts`. Update `CommunicationCenterPage.tsx` to wire all four tabs with real data.

**Tech Stack:** Express + Mongoose + TypeScript (backend), React + TypeScript + Tailwind (frontend), existing shadcn/ui components

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `backend/src/models/Campaign.ts` | Campaign Mongoose model |
| Create | `backend/src/models/MessageTemplate.ts` | Template Mongoose model |
| Create | `backend/src/routes/communicationRoutes.ts` | Stats, campaigns, templates REST endpoints |
| Modify | `backend/src/server.ts` | Register `/api/communication` route |
| Create | `src/pages/school-admin/modules/communication/TemplatesTab.tsx` | Templates tab UI (list/create/delete/use) |
| Create | `src/pages/school-admin/modules/communication/CalendarTab.tsx` | Calendar tab UI (monthly view of scheduled campaigns) |
| Modify | `src/pages/school-admin/modules/communication/AnnouncementForm.tsx` | Add AI draft button |
| Modify | `src/pages/school-admin/modules/communication/CommunicationCenterPage.tsx` | Wire campaigns, templates, calendar, AI draft |

---

## Task 1: Campaign Mongoose Model

**Files:**
- Create: `backend/src/models/Campaign.ts`

- [ ] **Step 1: Create the model**

```typescript
// backend/src/models/Campaign.ts
import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    internalNote: { type: String },
    publicCaption: { type: String },
    messageBody: { type: String, required: true },
    channels: [{ type: String, enum: ["APP", "EMAIL", "SMS", "WHATSAPP", "FACEBOOK", "INSTAGRAM"] }],
    audienceLabel: { type: String, default: "All" },
    status: { type: String, enum: ["DRAFT", "SCHEDULED", "SENT"], default: "DRAFT" },
    scheduledAt: { type: Date },
    ownerName: { type: String, required: true },
    priority: { type: String, enum: ["NORMAL", "HIGH", "URGENT"], default: "NORMAL" },
    approvalRequired: { type: Boolean, default: false },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Campaign", campaignSchema);
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/models/Campaign.ts
git commit -m "feat: add Campaign mongoose model"
```

---

## Task 2: MessageTemplate Mongoose Model

**Files:**
- Create: `backend/src/models/MessageTemplate.ts`

- [ ] **Step 1: Create the model**

```typescript
// backend/src/models/MessageTemplate.ts
import mongoose from "mongoose";

const messageTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subject: { type: String },
    body: { type: String, required: true },
    category: { type: String, default: "General" },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("MessageTemplate", messageTemplateSchema);
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/models/MessageTemplate.ts
git commit -m "feat: add MessageTemplate mongoose model"
```

---

## Task 3: Communication REST Routes

**Files:**
- Create: `backend/src/routes/communicationRoutes.ts`

- [ ] **Step 1: Create the route file**

```typescript
// backend/src/routes/communicationRoutes.ts
import express from "express";
import mongoose from "mongoose";
import Campaign from "../models/Campaign";
import MessageTemplate from "../models/MessageTemplate";
import Announcement from "../models/Announcement";
import { createLog } from "../utils/createLog";

const router = express.Router();

// GET /api/communication/stats?schoolId=
router.get("/stats", async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId?: string };
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const sid = new mongoose.Types.ObjectId(schoolId);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [activeCampaigns, scheduledCount, emailSmsSentWeek, whatsappSends24h] =
      await Promise.all([
        Campaign.countDocuments({ schoolId: sid, status: { $in: ["DRAFT", "SCHEDULED"] } }),
        Campaign.countDocuments({ schoolId: sid, status: "SCHEDULED" }),
        Campaign.countDocuments({
          schoolId: sid,
          status: "SENT",
          channels: { $in: ["EMAIL", "SMS"] },
          updatedAt: { $gte: weekAgo },
        }),
        Campaign.countDocuments({
          schoolId: sid,
          status: "SENT",
          channels: "WHATSAPP",
          updatedAt: { $gte: dayAgo },
        }),
      ]);

    res.json({ activeCampaigns, scheduledCount, whatsappSends24h, emailSmsSentWeek });
  } catch {
    res.status(500).json({ message: "Failed to load stats" });
  }
});

// GET /api/communication/campaigns?schoolId=
router.get("/campaigns", async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId?: string };
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const campaigns = await Campaign.find({
      schoolId: new mongoose.Types.ObjectId(schoolId),
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(
      campaigns.map((c) => ({
        id: String(c._id),
        title: c.title,
        subtitle: c.subtitle,
        channels: c.channels,
        audienceLabel: c.audienceLabel,
        status: c.status,
        scheduledAt: c.scheduledAt,
        ownerName: c.ownerName,
      }))
    );
  } catch {
    res.status(500).json({ message: "Failed to load campaigns" });
  }
});

// POST /api/communication/campaigns
router.post("/campaigns", async (req, res) => {
  try {
    const {
      title, subtitle, internalNote, publicCaption, messageBody,
      channels, audienceLabel, status, scheduledAt, ownerName,
      priority, approvalRequired, schoolId,
    } = req.body as {
      title?: string; subtitle?: string; internalNote?: string; publicCaption?: string;
      messageBody?: string; channels?: string[]; audienceLabel?: string;
      status?: string; scheduledAt?: string; ownerName?: string;
      priority?: string; approvalRequired?: boolean; schoolId?: string;
    };

    if (!title?.trim() || !messageBody?.trim() || !schoolId) {
      return res.status(400).json({ message: "title, messageBody, and schoolId are required" });
    }

    const campaign = await Campaign.create({
      title: title.trim(),
      subtitle: subtitle?.trim(),
      internalNote: internalNote?.trim(),
      publicCaption: publicCaption?.trim(),
      messageBody: messageBody.trim(),
      channels: channels ?? [],
      audienceLabel: audienceLabel ?? "All",
      status: status ?? "DRAFT",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      ownerName: ownerName ?? "School Administration",
      priority: priority ?? "NORMAL",
      approvalRequired: approvalRequired ?? false,
      schoolId: new mongoose.Types.ObjectId(schoolId),
    });

    await createLog({
      action: "CREATE_CAMPAIGN",
      message: `Campaign created: ${campaign.title}`,
      schoolId,
    });

    res.json({
      success: true,
      data: {
        id: String(campaign._id),
        title: campaign.title,
        subtitle: campaign.subtitle,
        channels: campaign.channels,
        audienceLabel: campaign.audienceLabel,
        status: campaign.status,
        scheduledAt: campaign.scheduledAt,
        ownerName: campaign.ownerName,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to create campaign" });
  }
});

// DELETE /api/communication/campaigns/:id
router.delete("/campaigns/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Failed to delete campaign" });
  }
});

// GET /api/communication/templates?schoolId=
router.get("/templates", async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId?: string };
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const templates = await MessageTemplate.find({
      schoolId: new mongoose.Types.ObjectId(schoolId),
    }).sort({ createdAt: -1 });

    res.json(templates);
  } catch {
    res.status(500).json({ message: "Failed to load templates" });
  }
});

// POST /api/communication/templates
router.post("/templates", async (req, res) => {
  try {
    const { name, subject, body, category, schoolId } = req.body as {
      name?: string; subject?: string; body?: string; category?: string; schoolId?: string;
    };

    if (!name?.trim() || !body?.trim() || !schoolId) {
      return res.status(400).json({ message: "name, body, and schoolId are required" });
    }

    const template = await MessageTemplate.create({
      name: name.trim(),
      subject: subject?.trim(),
      body: body.trim(),
      category: category?.trim() ?? "General",
      schoolId: new mongoose.Types.ObjectId(schoolId),
    });

    res.json({ success: true, data: template });
  } catch {
    res.status(500).json({ message: "Failed to create template" });
  }
});

// DELETE /api/communication/templates/:id
router.delete("/templates/:id", async (req, res) => {
  try {
    await MessageTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Failed to delete template" });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/communicationRoutes.ts
git commit -m "feat: add communication routes (stats, campaigns, templates)"
```

---

## Task 4: Register Route in server.ts

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Add import after the existing announcementRoutes import (line 9)**

```typescript
import communicationRoutes from "./routes/communicationRoutes";
```

- [ ] **Step 2: Add route registration after line 104 (`app.use("/api/announcements", ...)`)**

```typescript
app.use("/api/communication", authenticateToken, communicationRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat: register /api/communication routes in server"
```

---

## Task 5: TemplatesTab Frontend Component

**Files:**
- Create: `src/pages/school-admin/modules/communication/TemplatesTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/pages/school-admin/modules/communication/TemplatesTab.tsx
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

const defaultTemplateForm = (): TemplateFormState => ({
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
  const [form, setForm] = useState<TemplateFormState>(defaultTemplateForm());
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
      setForm(defaultTemplateForm());
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
      {/* Create form */}
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

      {/* Template list */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100" />
          ))}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/school-admin/modules/communication/TemplatesTab.tsx
git commit -m "feat: add TemplatesTab component"
```

---

## Task 6: CalendarTab Frontend Component

**Files:**
- Create: `src/pages/school-admin/modules/communication/CalendarTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/pages/school-admin/modules/communication/CalendarTab.tsx
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduledCampaign {
  id: string;
  title: string;
  scheduledAt: string;
  channels: string[];
  audienceLabel: string;
}

interface CalendarTabProps {
  campaigns: ScheduledCampaign[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function CalendarTab({ campaigns }: CalendarTabProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const scheduled = campaigns.filter((c) => c.scheduledAt);

  const campaignsByDate = scheduled.reduce<Record<string, ScheduledCampaign[]>>((acc, c) => {
    const d = new Date(c.scheduledAt);
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
      {/* Header */}
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

      {/* Grid */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-16 bg-slate-50/50" />;
            }
            const isToday =
              day === today.getDate() &&
              viewMonth === today.getMonth() &&
              viewYear === today.getFullYear();
            const hasCampaigns = Boolean(campaignsByDate[day.toString()]);
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
                    isToday
                      ? "bg-blue-600 text-white"
                      : "text-slate-700"
                  }`}
                >
                  {day}
                </span>
                {hasCampaigns && (
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {(campaignsByDate[day.toString()] ?? []).slice(0, 2).map((c) => (
                      <span
                        key={c.id}
                        className="block truncate rounded bg-blue-100 px-1 text-[10px] text-blue-700 max-w-full"
                      >
                        {c.title}
                      </span>
                    ))}
                    {(campaignsByDate[day.toString()]?.length ?? 0) > 2 && (
                      <span className="text-[10px] text-slate-400">
                        +{(campaignsByDate[day.toString()]?.length ?? 0) - 2} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && selectedCampaigns.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            {MONTHS[viewMonth]} {selected}, {viewYear} — {selectedCampaigns.length} campaign{selectedCampaigns.length !== 1 ? "s" : ""}
          </p>
          {selectedCampaigns.map((c) => (
            <div key={c.id} className="rounded-lg border border-blue-200 bg-white p-3 text-sm">
              <p className="font-medium text-slate-800">{c.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {c.audienceLabel} · {c.channels.join(", ") || "No channels"}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/school-admin/modules/communication/CalendarTab.tsx
git commit -m "feat: add CalendarTab component"
```

---

## Task 7: AI Draft Button in AnnouncementForm

**Files:**
- Modify: `src/pages/school-admin/modules/communication/AnnouncementForm.tsx`

- [ ] **Step 1: Add `onAiDraft` prop and AI draft button**

Replace the entire file with:

```tsx
// src/pages/school-admin/modules/communication/AnnouncementForm.tsx
import { useState } from "react";
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
import { Megaphone, Sparkles } from "lucide-react";
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
  onAiDraft?: (topic: string) => Promise<void>;
};

export default function AnnouncementForm({
  values,
  onChange,
  onSubmit,
  canSubmit,
  onAiDraft,
}: AnnouncementFormProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const handleAiDraft = async () => {
    if (!onAiDraft) return;
    const topic = values.title.trim() || "School update";
    setAiLoading(true);
    setAiError("");
    try {
      await onAiDraft(topic);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI draft failed");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-3 border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between gap-3">
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
          {onAiDraft && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAiDraft}
              disabled={aiLoading}
              className="shrink-0 border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {aiLoading ? "Generating…" : "AI draft"}
            </Button>
          )}
        </div>
        {aiError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {aiError}
          </p>
        )}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/school-admin/modules/communication/AnnouncementForm.tsx
git commit -m "feat: add AI draft button to AnnouncementForm"
```

---

## Task 8: Wire Everything in CommunicationCenterPage

**Files:**
- Modify: `src/pages/school-admin/modules/communication/CommunicationCenterPage.tsx`

This task replaces the entire file. Key changes:
1. `handleSaveDraft` → POST `/api/communication/campaigns` with status `"DRAFT"`
2. `handleSendCampaign` → POST `/api/communication/campaigns` with status `"SENT"` or `"SCHEDULED"`
3. Add `handleAiDraft` that calls `POST /api/announcements/ai-draft`
4. Pass `onAiDraft` prop to `AnnouncementForm`
5. Add templates state + fetch + pass to `TemplatesTab`
6. Import and render `TemplatesTab` and `CalendarTab`
7. `onUseTemplate` fills `annForm` title + message

- [ ] **Step 1: Replace the entire file**

```tsx
// src/pages/school-admin/modules/communication/CommunicationCenterPage.tsx
import { useEffect, useMemo, useState } from "react";
import { readStoredSchoolSession, readStoredRoleUser } from "@/lib/auth";
import {
  Send, Calendar, FileText, RefreshCw, Plus, Image,
  CheckCircle2, Clock, FileEdit, Megaphone, Mail, MessageSquare,
  Facebook, Instagram, Bell, Users, ChevronDown, X, Pin, SquarePen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AnnouncementForm from "./AnnouncementForm";
import AnnouncementFilters from "./AnnouncementFilters";
import AnnouncementList from "./AnnouncementList";
import TemplatesTab, { type MessageTemplate } from "./TemplatesTab";
import CalendarTab from "./CalendarTab";
import {
  createDefaultAnnouncementForm,
  type AnnouncementAudience,
  type AnnouncementFilter,
  type AnnouncementFormValues,
  type AnnouncementItem,
  type AnnouncementPriority,
} from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = "APP" | "EMAIL" | "SMS" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM";

interface CommunicationStats {
  activeCampaigns: number;
  scheduledCount: number;
  whatsappSends24h: number;
  emailSmsSentWeek: number;
}

interface Campaign {
  id: string;
  title: string;
  subtitle?: string;
  channels: Channel[];
  audienceLabel: string;
  status: "SCHEDULED" | "SENT" | "DRAFT";
  scheduledAt?: string;
  ownerName: string;
}

interface CampaignFormState {
  title: string;
  internalNote: string;
  publicCaption: string;
  messageBody: string;
  channels: Channel[];
  audience: string;
  priority: "NORMAL" | "HIGH" | "URGENT";
  scheduleEnabled: boolean;
  scheduledAt: string;
  approvalRequired: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_CHANNELS: { key: Channel; label: string }[] = [
  { key: "APP", label: "In-App" },
  { key: "EMAIL", label: "Email" },
  { key: "SMS", label: "SMS" },
  { key: "WHATSAPP", label: "WhatsApp" },
  { key: "FACEBOOK", label: "Facebook" },
  { key: "INSTAGRAM", label: "Instagram" },
];

const AUDIENCE_OPTIONS = ["All", "Parents", "Students", "Teachers", "Staff"];

const defaultForm = (): CampaignFormState => ({
  title: "",
  internalNote: "",
  publicCaption: "",
  messageBody: "",
  channels: [],
  audience: "All",
  priority: "NORMAL",
  scheduleEnabled: false,
  scheduledAt: "",
  approvalRequired: false,
});

// ─── Small components ─────────────────────────────────────────────────────────

const CHANNEL_META: Record<Channel, { label: string; color: string; icon: React.ReactNode }> = {
  APP: { label: "App", color: "bg-blue-100 text-blue-700", icon: <Bell className="h-3 w-3" /> },
  EMAIL: { label: "Email", color: "bg-purple-100 text-purple-700", icon: <Mail className="h-3 w-3" /> },
  SMS: { label: "SMS", color: "bg-green-100 text-green-700", icon: <MessageSquare className="h-3 w-3" /> },
  WHATSAPP: { label: "WA", color: "bg-emerald-100 text-emerald-700", icon: <MessageSquare className="h-3 w-3" /> },
  FACEBOOK: { label: "FB", color: "bg-indigo-100 text-indigo-700", icon: <Facebook className="h-3 w-3" /> },
  INSTAGRAM: { label: "IG", color: "bg-pink-100 text-pink-700", icon: <Instagram className="h-3 w-3" /> },
};

function ChannelBadge({ channel }: { channel: Channel }) {
  const meta = CHANNEL_META[channel];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function StatusPill({ status }: { status: Campaign["status"] }) {
  const map = {
    SCHEDULED: "bg-amber-100 text-amber-700",
    SENT: "bg-green-100 text-green-700",
    DRAFT: "bg-slate-100 text-slate-600",
  };
  const icons = {
    SCHEDULED: <Clock className="h-3 w-3" />,
    SENT: <CheckCircle2 className="h-3 w-3" />,
    DRAFT: <FileEdit className="h-3 w-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {icons[status]}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function StatCard({ label, value, icon, sub }: { label: string; value: number; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <span className="text-slate-400">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-8 w-16 rounded bg-slate-200" />
    </div>
  );
}

function StatsRow({ stats, loading }: { stats: CommunicationStats | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Active Campaigns" value={stats.activeCampaigns} icon={<Megaphone className="h-4 w-4" />} />
      <StatCard label="Scheduled" value={stats.scheduledCount} icon={<Clock className="h-4 w-4" />} sub="upcoming" />
      <StatCard label="WhatsApp (24h)" value={stats.whatsappSends24h} icon={<MessageSquare className="h-4 w-4" />} sub="sends" />
      <StatCard label="Email / SMS (week)" value={stats.emailSmsSentWeek} icon={<Mail className="h-4 w-4" />} sub="sent" />
    </div>
  );
}

function CampaignsTable({
  campaigns,
  loading,
  onDelete,
}: {
  campaigns: Campaign[];
  loading: boolean;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!campaigns.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
        No campaigns yet. Create your first campaign above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {["Campaign", "Channels", "Audience", "Status", "Scheduled", "Owner", ""].map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{c.title}</p>
                {c.subtitle && <p className="text-xs text-slate-400">{c.subtitle}</p>}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {c.channels.map((ch) => <ChannelBadge key={ch} channel={ch} />)}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">{c.audienceLabel}</td>
              <td className="px-4 py-3"><StatusPill status={c.status} /></td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">{c.ownerName}</td>
              <td className="px-4 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(c.id)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Announcement helpers ─────────────────────────────────────────────────────

type BackendAnnouncement = { _id: string; title: string; message: string; author: string; createdAt: string };
type AnnouncementMetaRecord = { audience: AnnouncementAudience; priority: AnnouncementPriority; publishDate: string; isPinned: boolean };

const metaKey = (id: string) => `school-communication-meta:${id}`;
const draftsKey = (id: string) => `school-communication-drafts:${id}`;

function loadMeta(schoolId: string): Record<string, AnnouncementMetaRecord> {
  try { const r = localStorage.getItem(metaKey(schoolId)); return r ? JSON.parse(r) : {}; } catch { return {}; }
}
function saveMeta(schoolId: string, v: Record<string, AnnouncementMetaRecord>) {
  localStorage.setItem(metaKey(schoolId), JSON.stringify(v));
}
function loadDrafts(schoolId: string): AnnouncementItem[] {
  try { const r = localStorage.getItem(draftsKey(schoolId)); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveDrafts(schoolId: string, v: AnnouncementItem[]) {
  localStorage.setItem(draftsKey(schoolId), JSON.stringify(v));
}
function sortItems(items: AnnouncementItem[]) {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return Number(b.isPinned) - Number(a.isPinned);
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  });
}
function isDraft(id: string) { return id.startsWith("draft-"); }
function newId() { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ann-${Date.now()}`; }
function newDraftId() { return `draft-${newId()}`; }
function mapBackend(a: BackendAnnouncement, meta: Record<string, AnnouncementMetaRecord>): AnnouncementItem {
  const m = meta[a._id];
  return { id: a._id, title: a.title, message: a.message, audience: m?.audience || "All", priority: m?.priority || "Normal", status: "Published", publishDate: m?.publishDate || new Date(a.createdAt).toISOString().slice(0, 10), isPinned: m?.isPinned || false, createdAt: a.createdAt };
}
function metaFromItem(a: AnnouncementItem): AnnouncementMetaRecord {
  return { audience: a.audience, priority: a.priority, publishDate: a.publishDate, isPinned: a.isPinned };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CommunicationCenterPageProps {
  schoolId?: string;
}

type ActiveTab = "announcements" | "campaigns" | "calendar" | "templates";

export default function CommunicationCenterPage({ schoolId: schoolIdProp }: CommunicationCenterPageProps) {
  const school = readStoredSchoolSession();
  const schoolId = schoolIdProp || (school?._id ? String(school._id) : "demo-school-id");
  const schoolName = school?.schoolInfo?.name || "School";
  const currentUser = readStoredRoleUser();
  const authorName = currentUser?.name || school?.adminInfo?.name || "School Administration";

  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("announcements");
  const [form, setForm] = useState<CampaignFormState>(defaultForm());
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignError, setCampaignError] = useState("");

  // ── Announcement state ──
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [annForm, setAnnForm] = useState<AnnouncementFormValues>(createDefaultAnnouncementForm);
  const [annLoading, setAnnLoading] = useState(true);
  const [annSaving, setAnnSaving] = useState(false);
  const [annError, setAnnError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<AnnouncementFilter>("All");

  // ── Templates state ──
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, campaignsRes] = await Promise.all([
        fetch(`/api/communication/stats?schoolId=${schoolId}`),
        fetch(`/api/communication/campaigns?schoolId=${schoolId}`),
      ]);
      if (!statsRes.ok || !campaignsRes.ok) throw new Error("Failed to load communication data");
      const [statsData, campaignsData] = await Promise.all([
        statsRes.json() as Promise<CommunicationStats>,
        campaignsRes.json() as Promise<Campaign[]>,
      ]);
      setStats(statsData);
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    if (!schoolId) { setAnnLoading(false); return; }
    try {
      setAnnLoading(true);
      setAnnError("");
      const res = await fetch(`/api/announcements/${schoolId}`);
      if (!res.ok) throw new Error(`Failed to load announcements (${res.status})`);
      const data = await res.json().catch(() => []);
      const meta = loadMeta(schoolId);
      const published = Array.isArray(data) ? data.map((a) => mapBackend(a as BackendAnnouncement, meta)) : [];
      setAnnouncements(sortItems([...published, ...loadDrafts(schoolId)]));
    } catch (err) {
      setAnnouncements(sortItems(loadDrafts(schoolId)));
      setAnnError(err instanceof Error ? err.message : "Failed to load announcements");
    } finally {
      setAnnLoading(false);
    }
  };

  const fetchTemplates = async () => {
    if (!schoolId) return;
    setTemplatesLoading(true);
    try {
      const res = await fetch(`/api/communication/templates?schoolId=${schoolId}`);
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json().catch(() => []);
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchAnnouncements();
    fetchTemplates();
    const handler = () => fetchAnnouncements();
    window.addEventListener("announcements-updated", handler);
    return () => window.removeEventListener("announcements-updated", handler);
  }, [schoolId]);

  // ── Campaign handlers ──
  const handleFormChange = <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleChannel = (ch: Channel) =>
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
    }));

  const submitCampaign = async (status: "DRAFT" | "SENT" | "SCHEDULED") => {
    if (!form.title.trim() || !form.messageBody.trim()) {
      setCampaignError("Campaign title and message body are required.");
      return;
    }
    try {
      setCampaignSaving(true);
      setCampaignError("");
      const resolvedStatus = status === "SENT" && form.scheduleEnabled ? "SCHEDULED" : status;
      const res = await fetch("/api/communication/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          internalNote: form.internalNote,
          publicCaption: form.publicCaption,
          messageBody: form.messageBody,
          channels: form.channels,
          audienceLabel: form.audience,
          status: resolvedStatus,
          scheduledAt: form.scheduleEnabled && form.scheduledAt ? form.scheduledAt : undefined,
          ownerName: authorName,
          priority: form.priority,
          approvalRequired: form.approvalRequired,
          schoolId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message ?? "Failed to save campaign");
      const created = data.data as Campaign;
      setCampaigns((cur) => [created, ...cur]);
      setStats((s) => s ? { ...s, activeCampaigns: s.activeCampaigns + 1, scheduledCount: resolvedStatus === "SCHEDULED" ? s.scheduledCount + 1 : s.scheduledCount } : s);
      setForm(defaultForm());
    } catch (err) {
      setCampaignError(err instanceof Error ? err.message : "Failed to save campaign");
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleSaveDraft = () => submitCampaign("DRAFT");
  const handleSendCampaign = () => submitCampaign("SENT");

  const handleDeleteCampaign = async (id: string) => {
    try {
      await fetch(`/api/communication/campaigns/${id}`, { method: "DELETE" });
      setCampaigns((cur) => cur.filter((c) => c.id !== id));
    } catch {
      // silently ignore
    }
  };

  // ── Announcement handlers ──
  const handleAnnFormChange = <K extends keyof AnnouncementFormValues>(field: K, value: AnnouncementFormValues[K]) =>
    setAnnForm((f) => ({ ...f, [field]: value }));

  const handleAiDraft = async (topic: string) => {
    const res = await fetch("/api/announcements/ai-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, author: authorName }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) throw new Error(data?.message ?? "AI draft failed");
    setAnnForm((f) => ({
      ...f,
      title: data.data.title ?? f.title,
      message: data.data.message ?? f.message,
    }));
  };

  const handleCreateAnnouncement = async () => {
    if (!annForm.title.trim() || !annForm.message.trim() || !schoolId) return;
    const base: AnnouncementItem = {
      id: newId(), title: annForm.title.trim(), message: annForm.message.trim(),
      audience: annForm.audience, priority: annForm.priority, status: annForm.status,
      publishDate: annForm.publishDate, isPinned: annForm.isPinned, createdAt: new Date().toISOString(),
    };
    try {
      setAnnSaving(true); setAnnError("");
      if (annForm.status === "Draft") {
        const draft = { ...base, id: newDraftId(), status: "Draft" as const };
        const next = sortItems([...loadDrafts(schoolId), draft]);
        saveDrafts(schoolId, next);
        setAnnouncements((cur) => sortItems([...cur, draft]));
      } else {
        const res = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: base.title, message: base.message, author: authorName, schoolId }) });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !data?.data?._id) throw new Error(data?.message || "Failed to create announcement");
        const meta = loadMeta(schoolId);
        meta[String(data.data._id)] = metaFromItem({ ...base, id: String(data.data._id), status: "Published" });
        saveMeta(schoolId, meta);
        const created = mapBackend(data.data as BackendAnnouncement, meta);
        setAnnouncements((cur) => sortItems([created, ...cur]));
        window.dispatchEvent(new Event("announcements-updated"));
      }
      setAnnForm(createDefaultAnnouncementForm());
    } catch (err) { setAnnError(err instanceof Error ? err.message : "Failed to save"); }
    finally { setAnnSaving(false); }
  };

  const handleTogglePin = (id: string) => {
    if (!schoolId) return;
    setAnnouncements((cur) => {
      const next = sortItems(cur.map((a) => a.id === id ? { ...a, isPinned: !a.isPinned } : a));
      if (isDraft(id)) { saveDrafts(schoolId, next.filter((a) => isDraft(a.id))); }
      else { const u = next.find((a) => a.id === id); if (u) { const m = loadMeta(schoolId); m[id] = metaFromItem(u); saveMeta(schoolId, m); } }
      return next;
    });
  };

  const handleToggleStatus = async (id: string) => {
    if (!schoolId) return;
    const item = announcements.find((a) => a.id === id);
    if (!item) return;
    try {
      setAnnSaving(true); setAnnError("");
      if (isDraft(id)) {
        const res = await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: item.title, message: item.message, author: authorName, schoolId }) });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !data?.data?._id) throw new Error(data?.message || "Failed to publish");
        saveDrafts(schoolId, loadDrafts(schoolId).filter((a) => a.id !== id));
        const meta = loadMeta(schoolId); meta[String(data.data._id)] = metaFromItem({ ...item, id: String(data.data._id), status: "Published" }); saveMeta(schoolId, meta);
        const pub = mapBackend(data.data as BackendAnnouncement, meta);
        setAnnouncements((cur) => sortItems([pub, ...cur.filter((a) => a.id !== id)]));
        window.dispatchEvent(new Event("announcements-updated"));
      } else {
        const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => null);
        if (!res.ok || data?.success === false) throw new Error(data?.message || "Failed to move to draft");
        const meta = loadMeta(schoolId); delete meta[id]; saveMeta(schoolId, meta);
        const draft: AnnouncementItem = { ...item, id: newDraftId(), status: "Draft" };
        saveDrafts(schoolId, sortItems([...loadDrafts(schoolId), draft]));
        setAnnouncements((cur) => sortItems([draft, ...cur.filter((a) => a.id !== id)]));
        window.dispatchEvent(new Event("announcements-updated"));
      }
    } catch (err) { setAnnError(err instanceof Error ? err.message : "Failed to update"); }
    finally { setAnnSaving(false); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!schoolId) return;
    try {
      setAnnSaving(true); setAnnError("");
      if (isDraft(id)) {
        saveDrafts(schoolId, loadDrafts(schoolId).filter((a) => a.id !== id));
        setAnnouncements((cur) => cur.filter((a) => a.id !== id));
      } else {
        const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => null);
        if (!res.ok || data?.success === false) throw new Error(data?.message || "Failed to delete");
        const meta = loadMeta(schoolId); delete meta[id]; saveMeta(schoolId, meta);
        setAnnouncements((cur) => cur.filter((a) => a.id !== id));
        window.dispatchEvent(new Event("announcements-updated"));
      }
    } catch (err) { setAnnError(err instanceof Error ? err.message : "Failed to delete"); }
    finally { setAnnSaving(false); }
  };

  const handleUseTemplate = (subject: string, body: string) => {
    setAnnForm((f) => ({ ...f, title: subject, message: body }));
    setActiveTab("announcements");
  };

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortItems(announcements).filter((a) => {
      const matchSearch = !q || a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q);
      const matchFilter = activeFilter === "All" || (activeFilter === "Pinned" && a.isPinned) || (activeFilter === "Draft" && a.status === "Draft") || (activeFilter === "Published" && a.status === "Published");
      return matchSearch && matchFilter;
    });
  }, [activeFilter, announcements, searchQuery]);

  const publishedCount = announcements.filter((a) => a.status === "Published").length;
  const draftCount = announcements.filter((a) => a.status === "Draft").length;
  const pinnedCount = announcements.filter((a) => a.isPinned).length;
  const canSubmitAnn = !annSaving && annForm.title.trim().length > 0 && annForm.message.trim().length > 0;

  const TABS: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: "announcements", label: "Announcements", icon: <Bell className="h-4 w-4" /> },
    { key: "campaigns", label: "Campaigns", icon: <Megaphone className="h-4 w-4" /> },
    { key: "calendar", label: "Calendar", icon: <Calendar className="h-4 w-4" /> },
    { key: "templates", label: "Templates", icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Communication Center</h1>
              <Badge className="border-slate-200 bg-slate-100 text-slate-600 text-xs">{schoolName}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">Write once, send everywhere — in-app · email · SMS · WhatsApp · social</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={campaignSaving}>
              <FileEdit className="mr-1.5 h-4 w-4" /> Save draft
            </Button>
            <Button size="sm" onClick={handleSendCampaign} disabled={campaignSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="mr-1.5 h-4 w-4" /> Send campaign
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="flex overflow-x-auto px-6">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <div className="flex items-center gap-2">
              <button onClick={fetchAll} className="flex items-center gap-1 font-medium underline underline-offset-2">
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
              <button onClick={() => setError("")}><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {/* KPI row - always visible */}
        <StatsRow stats={stats} loading={loading} />

        {/* Tab panels */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5">
            {activeTab === "announcements" && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><Send className="h-3.5 w-3.5" /> Published</div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{publishedCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><SquarePen className="h-3.5 w-3.5" /> Drafts</div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{draftCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><Pin className="h-3.5 w-3.5" /> Pinned</div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{pinnedCount}</p>
                  </div>
                </div>

                {annError && (
                  <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span>{annError}</span>
                    <button onClick={() => setAnnError("")}><X className="h-4 w-4" /></button>
                  </div>
                )}

                <AnnouncementForm
                  values={annForm}
                  onChange={handleAnnFormChange}
                  onSubmit={handleCreateAnnouncement}
                  canSubmit={canSubmitAnn}
                  onAiDraft={handleAiDraft}
                />

                <AnnouncementFilters
                  searchQuery={searchQuery}
                  activeFilter={activeFilter}
                  onSearchChange={setSearchQuery}
                  onFilterChange={setActiveFilter}
                  totalCount={announcements.length}
                  pinnedCount={pinnedCount}
                />

                <AnnouncementList
                  announcements={annLoading ? [] : filteredAnnouncements}
                  onTogglePin={handleTogglePin}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDeleteAnnouncement}
                />
              </div>
            )}

            {activeTab === "campaigns" && (
              <div className="space-y-6">
                {campaignError && (
                  <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span>{campaignError}</span>
                    <button onClick={() => setCampaignError("")}><X className="h-4 w-4" /></button>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  {/* Create campaign card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-blue-600" />
                      <h2 className="font-semibold text-slate-800">Create Campaign</h2>
                    </div>

                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                      placeholder="Campaign title *"
                      value={form.title}
                      onChange={(e) => handleFormChange("title", e.target.value)}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                      placeholder="Internal note (not sent to audience)"
                      value={form.internalNote}
                      onChange={(e) => handleFormChange("internalNote", e.target.value)}
                    />
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                      placeholder="Public caption (social / email subject)"
                      value={form.publicCaption}
                      onChange={(e) => handleFormChange("publicCaption", e.target.value)}
                    />
                    <textarea
                      rows={4}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 resize-none"
                      placeholder="Message body *"
                      value={form.messageBody}
                      onChange={(e) => handleFormChange("messageBody", e.target.value)}
                    />

                    <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-6 text-sm text-slate-400 cursor-pointer hover:border-blue-300 hover:text-blue-400 transition-colors">
                      <Image className="mr-2 h-4 w-4" /> Attach media (image / video / PDF)
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {form.channels.length > 0 && form.channels.map((ch) => (
                        <ChannelBadge key={ch} channel={ch} />
                      ))}
                      {form.audience !== "All" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          <Users className="h-3 w-3" /> {form.audience}
                        </span>
                      )}
                      {form.priority !== "NORMAL" && (
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                          {form.priority}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Send settings card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                    <h2 className="font-semibold text-slate-800">Send Settings</h2>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Channels</p>
                      <div className="flex flex-wrap gap-2">
                        {ALL_CHANNELS.map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => toggleChannel(key)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              form.channels.includes(key)
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Audience</p>
                      <div className="relative">
                        <select
                          className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm outline-none focus:border-blue-400"
                          value={form.audience}
                          onChange={(e) => handleFormChange("audience", e.target.value)}
                        >
                          {AUDIENCE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Priority</p>
                      <div className="flex gap-2">
                        {(["NORMAL", "HIGH", "URGENT"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => handleFormChange("priority", p)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              form.priority === p
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {p.charAt(0) + p.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center justify-between">
                      <span className="text-sm text-slate-700">Schedule for later</span>
                      <button
                        role="switch"
                        aria-checked={form.scheduleEnabled}
                        onClick={() => handleFormChange("scheduleEnabled", !form.scheduleEnabled)}
                        className={`relative h-5 w-9 rounded-full transition-colors ${form.scheduleEnabled ? "bg-blue-600" : "bg-slate-200"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.scheduleEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </label>
                    {form.scheduleEnabled && (
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                        value={form.scheduledAt}
                        onChange={(e) => handleFormChange("scheduledAt", e.target.value)}
                      />
                    )}

                    <label className="flex cursor-pointer items-center justify-between">
                      <span className="text-sm text-slate-700">Require approval before send</span>
                      <button
                        role="switch"
                        aria-checked={form.approvalRequired}
                        onClick={() => handleFormChange("approvalRequired", !form.approvalRequired)}
                        className={`relative h-5 w-9 rounded-full transition-colors ${form.approvalRequired ? "bg-blue-600" : "bg-slate-200"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.approvalRequired ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </label>
                  </div>
                </div>

                <CampaignsTable campaigns={campaigns} loading={loading} onDelete={handleDeleteCampaign} />
              </div>
            )}

            {activeTab === "calendar" && (
              <CalendarTab campaigns={campaigns} />
            )}

            {activeTab === "templates" && (
              <TemplatesTab
                schoolId={schoolId}
                templates={templates}
                loading={templatesLoading}
                onUseTemplate={handleUseTemplate}
                onRefresh={fetchTemplates}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/school-admin/modules/communication/CommunicationCenterPage.tsx
git commit -m "feat: wire campaigns, AI draft, templates, calendar in CommunicationCenterPage"
```

---

## Self-Review

**Spec coverage:**
- ✅ Fix "Failed to load communication data" → Task 3 + Task 4 add `/api/communication/stats` and `/api/communication/campaigns`
- ✅ Campaigns CRUD backend → Task 3 (POST/GET/DELETE `/api/communication/campaigns`)
- ✅ Stats wired → Task 3 stats endpoint + Task 8 fetchAll unchanged
- ✅ AI draft button → Task 7 adds button + Task 8 adds `handleAiDraft`
- ✅ Templates tab → Task 5 (frontend) + Task 3 (backend routes)
- ✅ Calendar tab → Task 6 (frontend renders scheduled campaigns)
- ✅ Campaign delete → Task 8 `handleDeleteCampaign` + `CampaignsTable` receives `onDelete`
- ✅ Route registered in server → Task 4

**Type consistency:**
- `MessageTemplate` exported from `TemplatesTab.tsx` and imported in `CommunicationCenterPage.tsx` ✅
- `CalendarTab` receives `campaigns: Campaign[]` — same type as `CommunicationCenterPage` ✅
- `onAiDraft?: (topic: string) => Promise<void>` matches `handleAiDraft` signature ✅
- `onDelete` prop added to `CampaignsTable` interface and passed through ✅
