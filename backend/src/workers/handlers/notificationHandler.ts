import type { Job } from "bullmq";
import nodemailer from "nodemailer";
import type { NotificationJobData, JobResult } from "../core/types";
import { fireEvent } from "../../modules/communication/services/triggerEngine";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;
  const env = process.env;
  _transporter = nodemailer.createTransport({
    host:   env.SMTP_HOST   ?? "smtp.gmail.com",
    port:   Number(env.SMTP_PORT ?? "587"),
    secure: (env.SMTP_SECURE ?? "false").toLowerCase() === "true",
    auth: {
      user: env.SMTP_USER ?? env.EMAIL_USER ?? "",
      pass: env.SMTP_PASS ?? env.EMAIL_PASSWORD ?? "",
    },
  });
  return _transporter;
}

export async function handleNotificationJob(job: Job<NotificationJobData>): Promise<JobResult> {
  const { data } = job;

  switch (data.type) {
    case "EMAIL":
      return sendSingleEmail(job as Job<Extract<NotificationJobData, { type: "EMAIL" }>>);
    case "BULK_EMAIL":
      return sendBulkEmail(job as Job<Extract<NotificationJobData, { type: "BULK_EMAIL" }>>);
    case "TRIGGER_EVENT":
      return fireTriggerEvent(job as Job<Extract<NotificationJobData, { type: "TRIGGER_EVENT" }>>);
    default: {
      const _exhaustive: never = data;
      throw new Error(`Unknown notification type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

async function sendSingleEmail(
  job: Job<Extract<NotificationJobData, { type: "EMAIL" }>>,
): Promise<JobResult> {
  const { to, subject, html } = job.data;
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@erp-portal.com";

  await job.updateProgress(20);
  await getTransporter().sendMail({ from, to, subject, html });
  await job.updateProgress(100);

  return { success: true, recipientCount: 1, message: `Email sent to ${to}` };
}

async function sendBulkEmail(
  job: Job<Extract<NotificationJobData, { type: "BULK_EMAIL" }>>,
): Promise<JobResult> {
  const { recipients, subject, html } = job.data;
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@erp-portal.com";
  const transporter = getTransporter();

  let sent = 0;
  const BATCH = 10;

  for (let i = 0; i < recipients.length; i += BATCH) {
    const slice = recipients.slice(i, i + BATCH);
    await Promise.allSettled(slice.map((to) => transporter.sendMail({ from, to, subject, html })));
    sent += slice.length;
    await job.updateProgress(Math.round((sent / recipients.length) * 100));
  }

  return { success: true, recipientCount: sent, message: `Bulk email sent to ${sent}/${recipients.length}` };
}

async function fireTriggerEvent(
  job: Job<Extract<NotificationJobData, { type: "TRIGGER_EVENT" }>>,
): Promise<JobResult> {
  const { eventType, schoolId, payload } = job.data;
  await job.updateProgress(10);

  type EventType = Parameters<typeof fireEvent>[0]["eventType"];
  const result = await fireEvent({ eventType: eventType as EventType, schoolId, payload });

  await job.updateProgress(100);
  return {
    success: true,
    recipientCount: result.triggered.length,
    message: `Trigger ${eventType}: ${result.triggered.length} fired, ${result.skipped.length} skipped`,
  };
}
