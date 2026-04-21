import type { PolicyAlert, PolicySeverity } from "../core/policies.js";
import type { Alerter } from "./alerter.js";

const COLORS: Record<PolicySeverity, string> = {
  info: "\x1b[36m",
  warning: "\x1b[33m",
  critical: "\x1b[31m",
};
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}

export function createConsoleAlerter(options?: { colors?: boolean }): Alerter {
  const useColors = options?.colors ?? process.stdout.isTTY ?? false;

  return {
    name: "console",
    fire(alert: PolicyAlert): void {
      const color = useColors ? COLORS[alert.severity] : "";
      const reset = useColors ? RESET : "";
      const bold = useColors ? BOLD : "";

      const header =
        `${color}${bold}[ARGUS ${alert.severity.toUpperCase()}]${reset}` +
        ` ${formatTimestamp(alert.timestamp)}` +
        ` policy=${alert.policyKind}:${alert.policyId}`;

      const body =
        `  wallet=${alert.event.wallet}` +
        ` agent=${alert.event.agentId}` +
        ` chain=${alert.event.chainId}` +
        ` event=${alert.event.kind}:${alert.event.id}`;

      const reason = `  reason: ${alert.reason}`;

      process.stdout.write(`${header}\n${body}\n${reason}\n`);
    },
  };
}
