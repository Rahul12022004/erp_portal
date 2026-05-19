import mongoose from "mongoose";
import CommunicationTrigger, { type EventType } from "../models/CommunicationTrigger";
import Campaign from "../models/Campaign";
import CampaignLog from "../models/CampaignLog";
import { fakeProviderSend } from "./fakeProvider";

// ─── Domain event shape ───────────────────────────────────────────────────────

export interface DomainEvent {
  eventType: EventType;
  schoolId: string;
  tenantId?: string;
  /** Free-form payload merged into template variables */
  payload: Record<string, unknown>;
}

export interface TriggerFireResult {
  triggerId: string;
  triggerName: string;
  campaignId: string;
  channelsQueued: string[];
  channelsFired: string[];
  errors: { channel: string; error: string }[];
}

export interface FireEventResult {
  eventType: EventType;
  schoolId: string;
  triggersFound: number;
  triggered: TriggerFireResult[];
  skipped: { triggerId: string; reason: string }[];
}

// ─── Default templates per event type ────────────────────────────────────────

const DEFAULT_TITLE: Record<EventType, string> = {
  ATTENDANCE_ABSENT: "Absence Alert — {{studentName}} ({{class}})",
  ATTENDANCE_LATE: "Late Arrival — {{studentName}} ({{class}})",
  FEE_DUE_SOON: "Fee Reminder — Due {{dueDate}}",
  FEE_OVERDUE: "URGENT: Fee Overdue — {{studentName}}",
  FEE_PAYMENT_RECEIVED: "Payment Received — ₹{{amount}}",
  EXAM_TIMETABLE_PUBLISHED: "Exam Timetable Published — {{examName}}",
  RESULT_PUBLISHED: "Results Available — {{studentName}}",
  NEW_ASSIGNMENT: "New Assignment: {{assignmentTitle}}",
  ASSIGNMENT_DUE_SOON: "Assignment Due Tomorrow — {{assignmentTitle}}",
  LIBRARY_BOOK_OVERDUE: "Library Book Overdue — {{bookTitle}}",
  LEAVE_APPROVED: "Leave Approved — {{teacherName}}",
  LEAVE_REJECTED: "Leave Rejected — {{teacherName}}",
  PARENT_MEETING_REMINDER: "Parent Meeting Reminder — {{date}}",
  ADMISSION_CONFIRMED: "Admission Confirmed — {{studentName}}",
};

const DEFAULT_BODY: Record<EventType, string> = {
  ATTENDANCE_ABSENT:
    "Dear {{parentName}},\n\nYour child {{studentName}} (Class {{class}}) was marked absent on {{date}}.\n\nIf this is unexpected, please contact the school office.\n\nRegards,\n{{schoolName}}",

  ATTENDANCE_LATE:
    "Dear {{parentName}},\n\nThis is to inform you that {{studentName}} arrived late to school today ({{date}}) at {{time}}.\n\nRegards,\n{{schoolName}}",

  FEE_DUE_SOON:
    "Dear {{parentName}},\n\nThis is a friendly reminder that the fee of ₹{{amount}} for {{studentName}} is due on {{dueDate}}.\n\nPlease ensure timely payment to avoid late fees.\n\nRegards,\n{{schoolName}}",

  FEE_OVERDUE:
    "Dear {{parentName}},\n\nThe fee of ₹{{amount}} for {{studentName}} was due on {{dueDate}} and remains unpaid.\n\nPlease clear the dues immediately or contact the accounts office.\n\nRegards,\n{{schoolName}}",

  FEE_PAYMENT_RECEIVED:
    "Dear {{parentName}},\n\nWe have received a payment of ₹{{amount}} for {{studentName}} on {{date}}. Receipt no: {{receiptNo}}.\n\nThank you!\n{{schoolName}}",

  EXAM_TIMETABLE_PUBLISHED:
    "Dear Parent/Student,\n\nThe timetable for {{examName}} has been published. Please log in to the portal to view the schedule.\n\nBest of luck!\n{{schoolName}}",

  RESULT_PUBLISHED:
    "Dear {{parentName}},\n\nThe results for {{examName}} are now available for {{studentName}}. Please log in to the portal to view the results.\n\nRegards,\n{{schoolName}}",

  NEW_ASSIGNMENT:
    "Dear {{studentName}},\n\nA new assignment \"{{assignmentTitle}}\" has been posted for {{subject}}. It is due on {{dueDate}}.\n\nRegards,\n{{teacherName}}",

  ASSIGNMENT_DUE_SOON:
    "Dear {{studentName}},\n\nReminder: Your assignment \"{{assignmentTitle}}\" for {{subject}} is due tomorrow ({{dueDate}}).\n\nPlease submit on time.\n\nRegards,\n{{teacherName}}",

  LIBRARY_BOOK_OVERDUE:
    "Dear {{studentName}},\n\nThe book \"{{bookTitle}}\" borrowed on {{borrowDate}} was due on {{dueDate}} and has not been returned.\n\nPlease return it at the earliest to avoid fines.\n\nRegards,\nLibrary, {{schoolName}}",

  LEAVE_APPROVED:
    "Dear {{teacherName}},\n\nYour leave request for {{fromDate}} to {{toDate}} has been approved.\n\nRegards,\nHR, {{schoolName}}",

  LEAVE_REJECTED:
    "Dear {{teacherName}},\n\nYour leave request for {{fromDate}} to {{toDate}} has been rejected. Reason: {{reason}}.\n\nPlease contact HR for details.\n\nRegards,\n{{schoolName}}",

  PARENT_MEETING_REMINDER:
    "Dear {{parentName}},\n\nThis is a reminder for the parent-teacher meeting on {{date}} at {{time}} in {{venue}}.\n\nWe look forward to seeing you.\n\nRegards,\n{{schoolName}}",

  ADMISSION_CONFIRMED:
    "Dear {{parentName}},\n\nWe are pleased to confirm the admission of {{studentName}} to {{schoolName}} for the academic year {{academicYear}}.\n\nWelcome to our school family!\n\nRegards,\nAdmissions, {{schoolName}}",
};

// ─── Template interpolation ───────────────────────────────────────────────────

/**
 * Replaces {{key}} tokens in a template string with values from vars.
 * Unknown keys are left as-is.
 */
function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}

// ─── Filter matching ──────────────────────────────────────────────────────────

/**
 * Returns true when every key in `filter` has a matching value in `payload`.
 * An empty filter {} matches everything.
 * Supports: exact match, array includes (filter value IN payload array).
 */
function matchesFilter(
  filter: Record<string, unknown>,
  payload: Record<string, unknown>
): boolean {
  for (const [key, expected] of Object.entries(filter)) {
    const actual = payload[key];
    if (Array.isArray(actual)) {
      if (!actual.includes(expected)) return false;
    } else if (Array.isArray(expected)) {
      if (!(expected as unknown[]).includes(actual)) return false;
    } else {
      if (String(actual) !== String(expected)) return false;
    }
  }
  return true;
}

// ─── Core engine ─────────────────────────────────────────────────────────────

export async function fireEvent(event: DomainEvent): Promise<FireEventResult> {
  const { eventType, schoolId, tenantId, payload } = event;

  const schoolOid = new mongoose.Types.ObjectId(schoolId);

  // 1. Load all enabled triggers for this school + eventType
  const triggers = await CommunicationTrigger.find({
    schoolId: schoolOid,
    eventType,
    isEnabled: true,
  }).lean();

  const result: FireEventResult = {
    eventType,
    schoolId,
    triggersFound: triggers.length,
    triggered: [],
    skipped: [],
  };

  if (!triggers.length) {
    console.log(`[TriggerEngine] No active triggers for ${eventType} @ school ${schoolId}`);
    return result;
  }

  console.log(`[TriggerEngine] ${triggers.length} trigger(s) match ${eventType} @ school ${schoolId}`);

  // 2. Process each trigger
  for (const trigger of triggers) {
    const tid = String(trigger._id);

    // Filter check
    if (!matchesFilter(trigger.filter ?? {}, payload)) {
      result.skipped.push({ triggerId: tid, reason: "filter mismatch" });
      console.log(`[TriggerEngine] Trigger ${tid} ("${trigger.name}") skipped — filter mismatch`);
      continue;
    }

    if (!trigger.channels.length) {
      result.skipped.push({ triggerId: tid, reason: "no channels configured" });
      continue;
    }

    // Build title + body from templates
    const titleTemplate = trigger.titleTemplate ?? DEFAULT_TITLE[eventType];
    const bodyTemplate = trigger.bodyTemplate ?? DEFAULT_BODY[eventType];
    const title = interpolate(titleTemplate, payload);
    const body = interpolate(bodyTemplate, payload);

    // 3. Create Campaign document (auto-generated, system-owned)
    const tenantOid = tenantId
      ? new mongoose.Types.ObjectId(tenantId)
      : schoolOid; // fallback: use schoolId as tenantId for single-tenant setups

    const campaign = await Campaign.create({
      tenantId: tenantOid,
      schoolId: schoolOid,
      title,
      body,
      internalNote: `Auto-triggered by ${eventType}`,
      priority: "NORMAL",
      status: "SENT",
      channels: trigger.channels.map((ch) => ({
        channel: ch.channel,
        isEnabled: true,
        templateId: ch.templateId,
        config: ch.config,
      })),
      audience: trigger.audienceType !== "ALL"
        ? [{ type: trigger.audienceType }]
        : [],
      createdBy: new mongoose.Types.ObjectId("000000000000000000000001"), // system actor
      approvalStatus: "NONE",
    });

    const campaignId = String(campaign._id);
    const channelsQueued: string[] = [];
    const channelsFired: string[] = [];
    const errors: { channel: string; error: string }[] = [];

    // 4. For each channel: create CampaignLog (QUEUED) then call provider
    for (const ch of trigger.channels) {
      try {
        // Log entry — QUEUED
        await CampaignLog.create({
          tenantId: tenantOid,
          schoolId: schoolOid,
          campaignId: campaign._id,
          channel: ch.channel,
          status: "QUEUED",
          details: { triggerId: tid, eventType, payload },
        });
        channelsQueued.push(ch.channel);

        // Dispatch via fake provider
        const sendResult = await fakeProviderSend({
          channel: ch.channel,
          campaignId,
          to: String(payload.phone ?? payload.email ?? payload.parentPhone ?? ""),
          subject: title,
          body,
          metadata: { triggerId: tid, eventType, payload },
        });

        // Update log to SENT
        await CampaignLog.create({
          tenantId: tenantOid,
          schoolId: schoolOid,
          campaignId: campaign._id,
          channel: ch.channel,
          status: sendResult.status,
          details: { externalRef: sendResult.externalRef, triggerId: tid },
        });
        channelsFired.push(ch.channel);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ channel: ch.channel, error: msg });
        console.error(`[TriggerEngine] Channel ${ch.channel} failed for campaign ${campaignId}: ${msg}`);

        await CampaignLog.create({
          tenantId: tenantOid,
          schoolId: schoolOid,
          campaignId: campaign._id,
          channel: ch.channel,
          status: "FAILED",
          details: { error: msg, triggerId: tid },
        }).catch(() => undefined);
      }
    }

    console.log(
      `[TriggerEngine] Trigger "${trigger.name}" → campaign ${campaignId} | queued: [${channelsQueued}] fired: [${channelsFired}]`
    );

    result.triggered.push({
      triggerId: tid,
      triggerName: trigger.name,
      campaignId,
      channelsQueued,
      channelsFired,
      errors,
    });
  }

  return result;
}
