import type { ConnectorField } from "../types/connectors";

/* Builders for a connector's credential fields. */

export const secret = (
  key: string,
  label: string,
  extra: Partial<ConnectorField> = {}
): ConnectorField => ({ key, label, type: "secret", required: true, ...extra });

export const text = (
  key: string,
  label: string,
  extra: Partial<ConnectorField> = {}
): ConnectorField => ({ key, label, type: "text", required: true, ...extra });

export const optional = (f: ConnectorField): ConnectorField => ({
  ...f,
  required: false,
});

/**
 * Optional sender throughput for the per-recipient channels (SMS, WhatsApp).
 * Sends are paced to this rate across every worker, so set it to what the
 * sender can really deliver: a 10DLC campaign's MPS, a short code, a WhatsApp
 * number's throughput. Blank uses the platform default.
 */
export const throughputFields = (): ConnectorField[] => [
  optional(
    text("sendRatePerSecond", "Messages per second", {
      placeholder: "10",
      hint: "Your sender's real throughput. Leave blank for the default.",
    })
  ),
  optional(
    text("dailySendLimit", "Daily send limit", {
      placeholder: "e.g. 1000",
      hint: "Optional cap per UTC day, such as a WhatsApp messaging tier. Sends past it wait until the next day.",
    })
  ),
  optional(
    text("quietHours", "Send window (recipient's local time)", {
      placeholder: "08:00-21:00",
      hint: "Messages outside this window wait until it opens in the recipient's time zone. Blank uses 08:00-21:00.",
    })
  ),
  optional(
    text("maxPerRecipientPerDay", "Max messages per person per day", {
      placeholder: "1",
      hint: "Across all campaigns. People over the limit are skipped. 0 means no limit.",
    })
  ),
  optional(
    text("maxPerRecipientPerWeek", "Max messages per person per week", {
      placeholder: "3",
      hint: "Across all campaigns, over the last 7 days. 0 means no limit.",
    })
  ),
];
