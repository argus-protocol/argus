import type { AgentEvent } from "../core/events.js";

export interface AdapterCapabilities {
  readonly canRevokeSessionKey: boolean;
  readonly canEnforceOnChainGuards: boolean;
}

export type AdapterEventHandler = (event: AgentEvent) => void | Promise<void>;

export interface Adapter {
  readonly name: string;
  readonly capabilities: AdapterCapabilities;
  start(onEvent: AdapterEventHandler): Promise<void> | void;
  stop(): Promise<void> | void;
}
