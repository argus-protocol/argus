import type { PolicyAlert } from "../core/policies.js";

export interface Alerter {
  readonly name: string;
  fire(alert: PolicyAlert): Promise<void> | void;
}
