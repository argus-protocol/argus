import type { AgentEvent } from "./events.js";

export type PolicySeverity = "info" | "warning" | "critical";

export type PolicyDecision =
  | { verdict: "pass" }
  | { verdict: "alert"; reason: string; severity: PolicySeverity };

export interface PolicyEvaluation<State> {
  readonly state: State;
  readonly decision: PolicyDecision;
}

export interface Policy<State = unknown> {
  readonly id: string;
  readonly kind: string;
  initialState(): State;
  evaluate(event: AgentEvent, state: State): PolicyEvaluation<State>;
}

export interface PolicyAlert {
  readonly policyId: string;
  readonly policyKind: string;
  readonly event: AgentEvent;
  readonly reason: string;
  readonly severity: PolicySeverity;
  readonly timestamp: number;
}

export function runPolicy<State>(
  policy: Policy<State>,
  event: AgentEvent,
  state: State,
): { state: State; alert: PolicyAlert | null } {
  const result = policy.evaluate(event, state);
  if (result.decision.verdict === "pass") {
    return { state: result.state, alert: null };
  }
  return {
    state: result.state,
    alert: {
      policyId: policy.id,
      policyKind: policy.kind,
      event,
      reason: result.decision.reason,
      severity: result.decision.severity,
      timestamp: Date.now(),
    },
  };
}
