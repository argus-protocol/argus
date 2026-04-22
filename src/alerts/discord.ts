import type { PolicyAlert, PolicySeverity } from "../core/policies.js";
import type { Alerter } from "./alerter.js";

export interface DiscordAlerterOptions {
  readonly webhookUrl: string;
  readonly username?: string;
  readonly timeoutMs?: number;
}

// Discord embed colors are decimal RGB.
const SEVERITY_COLOR: Record<PolicySeverity, number> = {
  info: 0x3498db,
  warning: 0xf1c40f,
  critical: 0xe74c3c,
};

const DEFAULT_USERNAME = "Argus";
const DEFAULT_TIMEOUT_MS = 5000;

export function createDiscordAlerter(opts: DiscordAlerterOptions): Alerter {
  if (!opts.webhookUrl || !opts.webhookUrl.startsWith("https://")) {
    throw new Error("DiscordAlerter requires an https webhookUrl");
  }
  const username = opts.username ?? DEFAULT_USERNAME;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    name: "discord",
    async fire(alert: PolicyAlert): Promise<void> {
      const payload = buildPayload(alert, username);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(opts.webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "<no body>");
          throw new Error(
            `Discord webhook failed: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`,
          );
        }
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

interface DiscordEmbedField {
  readonly name: string;
  readonly value: string;
  readonly inline?: boolean;
}

interface DiscordEmbed {
  readonly title: string;
  readonly description: string;
  readonly color: number;
  readonly fields: DiscordEmbedField[];
  readonly timestamp: string;
}

interface DiscordWebhookPayload {
  readonly username: string;
  readonly embeds: DiscordEmbed[];
}

function buildPayload(
  alert: PolicyAlert,
  username: string,
): DiscordWebhookPayload {
  const title = `${alert.severity.toUpperCase()}: ${alert.policyKind}`;
  const fields: DiscordEmbedField[] = [
    { name: "Policy", value: alert.policyId, inline: true },
    { name: "Agent", value: alert.event.agentId, inline: true },
    { name: "Chain", value: String(alert.event.chainId), inline: true },
    { name: "Wallet", value: codeInline(alert.event.wallet), inline: false },
  ];
  if (alert.event.kind === "tx_send") {
    fields.push({ name: "To", value: codeInline(alert.event.to), inline: false });
    fields.push({ name: "Value (wei)", value: alert.event.valueWei, inline: true });
  }
  fields.push({
    name: "Event ID",
    value: codeInline(alert.event.id),
    inline: false,
  });

  return {
    username,
    embeds: [
      {
        title,
        description: alert.reason,
        color: SEVERITY_COLOR[alert.severity],
        fields,
        timestamp: new Date(alert.timestamp).toISOString(),
      },
    ],
  };
}

function codeInline(s: string): string {
  return "`" + s.replaceAll("`", "") + "`";
}
