import type { ChannelKey } from "../models/Campaign";

export interface SendResult {
  channel: ChannelKey;
  campaignId: string;
  recipient?: string;
  status: "SENT" | "FAILED";
  externalRef?: string;
  error?: string;
}

interface SendPayload {
  channel: ChannelKey;
  campaignId: string;
  to?: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

/**
 * Stub provider — logs to console, simulates latency-free delivery.
 * Replace individual channel branches with real SDK calls (Twilio, SendGrid, etc.)
 */
export async function fakeProviderSend(payload: SendPayload): Promise<SendResult> {
  const ref = `fake-${payload.channel}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  switch (payload.channel) {
    case "WHATSAPP":
      console.log(
        `[WHATSAPP] → ${payload.to ?? "unknown"} | campaign=${payload.campaignId}\n` +
        `  body: ${payload.body.slice(0, 120)}${payload.body.length > 120 ? "…" : ""}\n` +
        `  ref: ${ref}`
      );
      break;

    case "SMS":
      console.log(
        `[SMS] → ${payload.to ?? "unknown"} | campaign=${payload.campaignId}\n` +
        `  body: ${payload.body.slice(0, 160)}\n` +
        `  ref: ${ref}`
      );
      break;

    case "EMAIL":
      console.log(
        `[EMAIL] → ${payload.to ?? "unknown"} | campaign=${payload.campaignId}\n` +
        `  subject: ${payload.subject ?? "(no subject)"}\n` +
        `  body: ${payload.body.slice(0, 200)}${payload.body.length > 200 ? "…" : ""}\n` +
        `  ref: ${ref}`
      );
      break;

    case "APP":
      console.log(
        `[IN-APP PUSH] campaign=${payload.campaignId}\n` +
        `  body: ${payload.body.slice(0, 120)}\n` +
        `  ref: ${ref}`
      );
      break;

    default:
      console.log(
        `[${payload.channel}] campaign=${payload.campaignId} | ref: ${ref}`
      );
  }

  return {
    channel: payload.channel,
    campaignId: payload.campaignId,
    recipient: payload.to,
    status: "SENT",
    externalRef: ref,
  };
}
