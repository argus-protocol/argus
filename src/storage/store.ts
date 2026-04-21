import type { AgentEvent } from "../core/events.js";
import type { PolicyAlert } from "../core/policies.js";

export interface Store {
  appendEvent(event: AgentEvent): void;
  recentEvents(limit: number): AgentEvent[];
  getPolicyState(policyId: string): unknown | null;
  putPolicyState(policyId: string, state: unknown): void;
  appendAlert(alert: PolicyAlert): void;
  recentAlerts(limit: number): PolicyAlert[];
  close(): void;
}
