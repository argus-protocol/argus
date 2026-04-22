import type { AgentEvent } from "../core/events.js";
import type { PolicyAlert } from "../core/policies.js";

export interface AgentSummary {
  readonly agentId: string;
  readonly wallet: string;
  readonly chainId: number;
  readonly lastSeen: number;
  readonly txCount24h: number;
  readonly spendWei24h: string;
  readonly alertCount24h: number;
}

export interface StoredAlert extends PolicyAlert {
  readonly id: number;
}

export interface Store {
  appendEvent(event: AgentEvent): void;
  recentEvents(limit: number): AgentEvent[];
  eventsForAgent(agentId: string, limit: number): AgentEvent[];
  listAgents(nowMs: number): AgentSummary[];
  getPolicyState(policyId: string): unknown | null;
  putPolicyState(policyId: string, state: unknown): void;
  appendAlert(alert: PolicyAlert): void;
  recentAlerts(limit: number): StoredAlert[];
  alertsForAgent(agentId: string, limit: number): StoredAlert[];
  getAlert(id: number): StoredAlert | null;
  close(): void;
}
