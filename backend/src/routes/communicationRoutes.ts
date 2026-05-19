import express from "express";
import mongoose from "mongoose";
import Campaign from "../models/Campaign";
import CampaignLog from "../models/CampaignLog";
import MessageTemplate from "../models/MessageTemplate";
import CommunicationTrigger, { EVENT_TYPES } from "../models/CommunicationTrigger";
import { fireEvent } from "../services/triggerEngine";
import { createLog } from "../core/utils/createLog";

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}

function getSchoolId(req: express.Request): string | null {
  // Prefer authenticated context from JWT middleware (req.user), fall back to query
  const fromUser = (req as any).user?.schoolId as string | undefined;
  const fromQuery = req.query.schoolId as string | undefined;
  return fromUser || fromQuery || null;
}

function getTenantId(req: express.Request): string | null {
  const fromUser = (req as any).user?.tenantId as string | undefined;
  const fromQuery = req.query.tenantId as string | undefined;
  return fromUser || fromQuery || null;
}

function getCreatedBy(req: express.Request): string {
  return ((req as any).user?._id as string | undefined) ?? "000000000000000000000000";
}

// ─── GET /api/communication/stats ─────────────────────────────────────────────
//
// Example response:
// {
//   "activeCampaigns": 3,
//   "scheduledCount": 1,
//   "whatsappSends24h": 42,
//   "emailSmsSentWeek": 180
// }

router.get("/stats", async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const sid = toObjectId(schoolId);
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Pipeline 1 — active + scheduled counts from campaigns collection
    const campaignStatsPipeline = [
      { $match: { schoolId: sid, status: { $in: ["DRAFT", "SCHEDULED"] } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ];

    // Pipeline 2 — WhatsApp sends in last 24 h from campaign_logs
    const whatsappPipeline = [
      {
        $match: {
          schoolId: sid,
          channel: "WHATSAPP",
          status: { $in: ["SENT", "DELIVERED"] },
          createdAt: { $gte: dayAgo },
        },
      },
      { $count: "total" },
    ];

    // Pipeline 3 — Email + SMS sends in last 7 days from campaign_logs
    const emailSmsPipeline = [
      {
        $match: {
          schoolId: sid,
          channel: { $in: ["EMAIL", "SMS"] },
          status: { $in: ["SENT", "DELIVERED"] },
          createdAt: { $gte: weekAgo },
        },
      },
      { $count: "total" },
    ];

    const [campaignStats, whatsappResult, emailSmsResult] = await Promise.all([
      Campaign.aggregate(campaignStatsPipeline),
      CampaignLog.aggregate(whatsappPipeline),
      CampaignLog.aggregate(emailSmsPipeline),
    ]);

    const statMap = Object.fromEntries(
      (campaignStats as { _id: string; count: number }[]).map((s) => [s._id, s.count])
    );

    res.json({
      activeCampaigns: (statMap["DRAFT"] ?? 0) + (statMap["SCHEDULED"] ?? 0),
      scheduledCount: statMap["SCHEDULED"] ?? 0,
      whatsappSends24h: (whatsappResult[0] as { total?: number } | undefined)?.total ?? 0,
      emailSmsSentWeek: (emailSmsResult[0] as { total?: number } | undefined)?.total ?? 0,
    });
  } catch (err) {
    console.error("COMM STATS ERROR:", err);
    res.status(500).json({ message: "Failed to load stats" });
  }
});

// ─── GET /api/communication/campaigns ────────────────────────────────────────
//
// Query params: schoolId, page (default 1), limit (default 20)
//
// Example response:
// {
//   "data": [
//     {
//       "id": "665abc...",
//       "title": "Exam Schedule Released",
//       "subtitle": "Final exams - June 2026",
//       "channels": [{ "channel": "EMAIL", "isEnabled": true }, { "channel": "APP", "isEnabled": true }],
//       "audience": [{ "type": "PARENTS", "classes": ["10A","10B"] }],
//       "audienceLabel": "Parents",
//       "status": "SCHEDULED",
//       "scheduledAt": "2026-06-01T08:00:00.000Z",
//       "priority": "HIGH",
//       "approvalStatus": "APPROVED",
//       "ownerName": "Admin"
//     }
//   ],
//   "total": 12,
//   "page": 1,
//   "pages": 1
// }

router.get("/campaigns", async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      schoolId: toObjectId(schoolId),
    };
    if (req.query.status) filter.status = req.query.status;

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Campaign.countDocuments(filter),
    ]);

    const data = campaigns.map((c) => ({
      id: String(c._id),
      title: c.title,
      subtitle: c.subtitle,
      channels: c.channels,
      audience: c.audience,
      audienceLabel: c.audience.map((a) => a.type).join(", ") || "All",
      status: c.status,
      scheduledAt: c.scheduledAt,
      priority: c.priority,
      approvalStatus: c.approvalStatus,
      ownerName: String(c.createdBy),
    }));

    res.json({ data, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("GET CAMPAIGNS ERROR:", err);
    res.status(500).json({ message: "Failed to load campaigns" });
  }
});

// ─── POST /api/communication/campaigns ───────────────────────────────────────
//
// Example request body:
// {
//   "title": "Exam Schedule Released",
//   "subtitle": "Final exams - June 2026",
//   "body": "Dear Parents, ...",
//   "priority": "HIGH",
//   "scheduledAt": "2026-06-01T08:00:00.000Z",
//   "channels": [
//     { "channel": "EMAIL", "isEnabled": true },
//     { "channel": "APP", "isEnabled": true }
//   ],
//   "audience": [
//     { "type": "PARENTS", "classes": ["10A", "10B"] }
//   ],
//   "approvalRequired": true,
//   "schoolId": "..."
// }

router.post("/campaigns", async (req, res) => {
  try {
    const {
      title, subtitle, internalNote, publicCaption, body,
      priority, scheduledAt, channels, audience,
      approvalRequired, schoolId: bodySchoolId,
    } = req.body as {
      title?: string; subtitle?: string; internalNote?: string; publicCaption?: string;
      body?: string; priority?: string; scheduledAt?: string;
      channels?: { channel: string; isEnabled?: boolean; templateId?: string; config?: Record<string, unknown> }[];
      audience?: { type: string; classes?: string[]; tags?: string[] }[];
      approvalRequired?: boolean; schoolId?: string;
    };

    const schoolId = getSchoolId(req) || bodySchoolId;
    if (!title?.trim() || !body?.trim() || !schoolId) {
      return res.status(400).json({ message: "title, body, and schoolId are required" });
    }

    const tenantId = getTenantId(req) || schoolId;

    const campaign = await Campaign.create({
      tenantId: toObjectId(tenantId),
      schoolId: toObjectId(schoolId),
      title: title.trim(),
      subtitle: subtitle?.trim(),
      internalNote: internalNote?.trim(),
      publicCaption: publicCaption?.trim(),
      body: body.trim(),
      priority: priority ?? "NORMAL",
      status: "DRAFT",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      createdBy: toObjectId(getCreatedBy(req)),
      approvalStatus: approvalRequired ? "PENDING_REVIEW" : "NONE",
      channels: (channels ?? []).map((ch) => ({
        channel: ch.channel,
        isEnabled: ch.isEnabled ?? true,
        templateId: ch.templateId ? toObjectId(ch.templateId) : undefined,
        config: ch.config,
      })),
      audience: audience ?? [],
    });

    await createLog({
      action: "CREATE_CAMPAIGN",
      message: `Campaign created: ${campaign.title}`,
      schoolId,
    });

    res.status(201).json({
      success: true,
      data: {
        id: String(campaign._id),
        title: campaign.title,
        subtitle: campaign.subtitle,
        channels: campaign.channels,
        audience: campaign.audience,
        audienceLabel: campaign.audience.map((a) => a.type).join(", ") || "All",
        status: campaign.status,
        scheduledAt: campaign.scheduledAt,
        priority: campaign.priority,
        approvalStatus: campaign.approvalStatus,
        ownerName: String(campaign.createdBy),
      },
    });
  } catch (err) {
    console.error("CREATE CAMPAIGN ERROR:", err);
    res.status(500).json({ message: "Failed to create campaign" });
  }
});

// ─── PATCH /api/communication/campaigns/:id ───────────────────────────────────

router.patch("/campaigns/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    if (!["DRAFT", "SCHEDULED"].includes(campaign.status)) {
      return res.status(400).json({ message: "Only DRAFT or SCHEDULED campaigns can be updated" });
    }

    const allowed = [
      "title", "subtitle", "internalNote", "publicCaption", "body",
      "priority", "status", "scheduledAt", "channels", "audience",
      "approvalStatus", "approvalComment",
    ] as const;

    for (const key of allowed) {
      if (key in req.body) {
        (campaign as any)[key] = req.body[key];
      }
    }

    await campaign.save();
    res.json({ success: true, data: campaign });
  } catch (err) {
    console.error("PATCH CAMPAIGN ERROR:", err);
    res.status(500).json({ message: "Failed to update campaign" });
  }
});

// ─── DELETE /api/communication/campaigns/:id ──────────────────────────────────

router.delete("/campaigns/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE CAMPAIGN ERROR:", err);
    res.status(500).json({ message: "Failed to delete campaign" });
  }
});

// ─── GET /api/communication/templates ────────────────────────────────────────

router.get("/templates", async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const templates = await MessageTemplate.find({
      schoolId: toObjectId(schoolId),
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(templates);
  } catch (err) {
    console.error("GET TEMPLATES ERROR:", err);
    res.status(500).json({ message: "Failed to load templates" });
  }
});

// ─── POST /api/communication/templates ───────────────────────────────────────

router.post("/templates", async (req, res) => {
  try {
    const { name, subject, body, category, schoolId: bodySchoolId } = req.body as {
      name?: string; subject?: string; body?: string; category?: string; schoolId?: string;
    };

    const schoolId = getSchoolId(req) || bodySchoolId;
    if (!name?.trim() || !body?.trim() || !schoolId) {
      return res.status(400).json({ message: "name, body, and schoolId are required" });
    }

    const tenantId = getTenantId(req);

    const template = await MessageTemplate.create({
      ...(tenantId ? { tenantId: toObjectId(tenantId) } : {}),
      schoolId: toObjectId(schoolId),
      name: name.trim(),
      subject: subject?.trim(),
      body: body.trim(),
      category: category?.trim() ?? "General",
    });

    res.status(201).json({ success: true, data: template });
  } catch (err) {
    console.error("CREATE TEMPLATE ERROR:", err);
    res.status(500).json({ message: "Failed to create template" });
  }
});

// ─── DELETE /api/communication/templates/:id ──────────────────────────────────

router.delete("/templates/:id", async (req, res) => {
  try {
    await MessageTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE TEMPLATE ERROR:", err);
    res.status(500).json({ message: "Failed to delete template" });
  }
});

// ─── GET /api/communication/triggers ─────────────────────────────────────────
//
// Query params: schoolId, eventType (optional filter)
//
// Example response:
// [
//   {
//     "_id": "...",
//     "name": "Absent → WhatsApp to parent",
//     "eventType": "ATTENDANCE_ABSENT",
//     "isEnabled": true,
//     "channels": [{ "channel": "WHATSAPP", "isEnabled": true }],
//     "filter": { "class": "10A" },
//     "audienceType": "PARENTS"
//   }
// ]

router.get("/triggers", async (req, res) => {
  try {
    const schoolId = getSchoolId(req);
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const query: Record<string, unknown> = { schoolId: toObjectId(schoolId) };
    if (req.query.eventType) query.eventType = req.query.eventType;
    if (req.query.isEnabled !== undefined) query.isEnabled = req.query.isEnabled === "true";

    const triggers = await CommunicationTrigger.find(query).sort({ eventType: 1, createdAt: -1 }).lean();
    res.json(triggers);
  } catch (err) {
    console.error("GET TRIGGERS ERROR:", err);
    res.status(500).json({ message: "Failed to load triggers" });
  }
});

// ─── POST /api/communication/triggers ────────────────────────────────────────
//
// Example request body (student absent → WhatsApp + SMS to parent):
// {
//   "name": "Absent → WhatsApp + SMS to parent",
//   "eventType": "ATTENDANCE_ABSENT",
//   "channels": [
//     { "channel": "WHATSAPP" },
//     { "channel": "SMS" }
//   ],
//   "filter": { "class": "10A" },
//   "audienceType": "PARENTS",
//   "bodyTemplate": "Dear {{parentName}}, your child {{studentName}} was absent today ({{date}}).",
//   "schoolId": "..."
// }
//
// Example request body (fee overdue → WhatsApp to parent):
// {
//   "name": "Fee Overdue → WhatsApp reminder",
//   "eventType": "FEE_OVERDUE",
//   "channels": [{ "channel": "WHATSAPP" }],
//   "filter": {},
//   "audienceType": "PARENTS",
//   "bodyTemplate": "Dear {{parentName}}, fee of ₹{{amount}} for {{studentName}} is overdue since {{dueDate}}. Please pay immediately.",
//   "schoolId": "..."
// }

router.post("/triggers", async (req, res) => {
  try {
    const {
      name, eventType, channels, filter, titleTemplate, bodyTemplate,
      audienceType, isEnabled, schoolId: bodySchoolId,
    } = req.body as {
      name?: string; eventType?: string; channels?: unknown[];
      filter?: Record<string, unknown>; titleTemplate?: string; bodyTemplate?: string;
      audienceType?: string; isEnabled?: boolean; schoolId?: string;
    };

    const schoolId = getSchoolId(req) || bodySchoolId;
    if (!name?.trim() || !eventType || !schoolId) {
      return res.status(400).json({ message: "name, eventType, and schoolId are required" });
    }
    if (!(EVENT_TYPES as readonly string[]).includes(eventType)) {
      return res.status(400).json({
        message: `Invalid eventType. Valid values: ${EVENT_TYPES.join(", ")}`,
      });
    }

    const tenantId = getTenantId(req) || schoolId;

    const trigger = await CommunicationTrigger.create({
      tenantId: toObjectId(tenantId),
      schoolId: toObjectId(schoolId),
      name: name.trim(),
      eventType,
      isEnabled: isEnabled ?? true,
      channels: (channels ?? []) as { channel: string }[],
      filter: filter ?? {},
      titleTemplate: titleTemplate?.trim(),
      bodyTemplate: bodyTemplate?.trim(),
      audienceType: audienceType ?? "PARENTS",
    });

    res.status(201).json({ success: true, data: trigger });
  } catch (err) {
    console.error("CREATE TRIGGER ERROR:", err);
    res.status(500).json({ message: "Failed to create trigger" });
  }
});

// ─── PATCH /api/communication/triggers/:id ────────────────────────────────────

router.patch("/triggers/:id", async (req, res) => {
  try {
    const allowed = [
      "name", "isEnabled", "channels", "filter",
      "titleTemplate", "bodyTemplate", "audienceType",
    ] as const;

    const trigger = await CommunicationTrigger.findById(req.params.id);
    if (!trigger) return res.status(404).json({ message: "Trigger not found" });

    for (const key of allowed) {
      if (key in req.body) (trigger as any)[key] = req.body[key];
    }

    await trigger.save();
    res.json({ success: true, data: trigger });
  } catch (err) {
    console.error("PATCH TRIGGER ERROR:", err);
    res.status(500).json({ message: "Failed to update trigger" });
  }
});

// ─── DELETE /api/communication/triggers/:id ───────────────────────────────────

router.delete("/triggers/:id", async (req, res) => {
  try {
    await CommunicationTrigger.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE TRIGGER ERROR:", err);
    res.status(500).json({ message: "Failed to delete trigger" });
  }
});

// ─── POST /api/communication/test-event ──────────────────────────────────────
//
// Fires a domain event, matches active triggers, creates campaigns + logs.
//
// Example — student absent:
// POST /api/communication/test-event
// {
//   "eventType": "ATTENDANCE_ABSENT",
//   "schoolId": "<your-school-id>",
//   "payload": {
//     "studentName": "Riya Sharma",
//     "parentName": "Mr. Sharma",
//     "class": "10A",
//     "date": "2026-05-09",
//     "phone": "+919876543210",
//     "schoolName": "Don Bosco School"
//   }
// }
//
// Example — fee overdue:
// POST /api/communication/test-event
// {
//   "eventType": "FEE_OVERDUE",
//   "schoolId": "<your-school-id>",
//   "payload": {
//     "studentName": "Arjun Patel",
//     "parentName": "Mrs. Patel",
//     "amount": "12500",
//     "dueDate": "2026-04-30",
//     "phone": "+919123456789",
//     "schoolName": "Don Bosco School"
//   }
// }
//
// Example response:
// {
//   "success": true,
//   "result": {
//     "eventType": "ATTENDANCE_ABSENT",
//     "schoolId": "...",
//     "triggersFound": 1,
//     "triggered": [
//       {
//         "triggerId": "...",
//         "triggerName": "Absent → WhatsApp + SMS to parent",
//         "campaignId": "...",
//         "channelsQueued": ["WHATSAPP", "SMS"],
//         "channelsFired": ["WHATSAPP", "SMS"],
//         "errors": []
//       }
//     ],
//     "skipped": []
//   }
// }

router.post("/test-event", async (req, res) => {
  try {
    const { eventType, schoolId: bodySchoolId, tenantId: bodyTenantId, payload } = req.body as {
      eventType?: string; schoolId?: string; tenantId?: string;
      payload?: Record<string, unknown>;
    };

    const schoolId = getSchoolId(req) || bodySchoolId;
    if (!eventType || !schoolId) {
      return res.status(400).json({ message: "eventType and schoolId are required" });
    }
    if (!(EVENT_TYPES as readonly string[]).includes(eventType)) {
      return res.status(400).json({
        message: `Invalid eventType. Valid values: ${EVENT_TYPES.join(", ")}`,
      });
    }

    const tenantId = getTenantId(req) || bodyTenantId || schoolId;

    const result = await fireEvent({
      eventType: eventType as typeof EVENT_TYPES[number],
      schoolId,
      tenantId,
      payload: payload ?? {},
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error("TEST-EVENT ERROR:", err);
    res.status(500).json({ message: "Failed to fire event" });
  }
});

export default router;
