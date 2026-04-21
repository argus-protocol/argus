import { randomUUID } from "node:crypto";
import type { Adapter, AdapterEventHandler } from "./adapter.js";
import { parseAgentEvent, type AgentEvent } from "../core/events.js";

export interface SyntheticAdapterConfig {
  agentId?: string;
  wallet?: string;
  chainId?: number;
  intervalMs?: number;
  valuesWei?: readonly string[];
  recipients?: readonly string[];
}

const DEFAULT_WALLET = "0x000000000000000000000000000000000000a115";
const DEFAULT_RECIPIENTS = [
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
];
const DEFAULT_VALUES_WEI = [
  "100000000000000000",
  "250000000000000000",
  "500000000000000000",
  "1000000000000000000",
  "2000000000000000000",
];

export function createSyntheticAdapter(
  config: SyntheticAdapterConfig = {},
): Adapter {
  const agentId = config.agentId ?? "synthetic-agent-1";
  const wallet = config.wallet ?? DEFAULT_WALLET;
  const chainId = config.chainId ?? 8453;
  const intervalMs = config.intervalMs ?? 1000;
  const values = config.valuesWei ?? DEFAULT_VALUES_WEI;
  const recipients = config.recipients ?? DEFAULT_RECIPIENTS;

  let timer: NodeJS.Timeout | null = null;
  let counter = 0;

  return {
    name: "synthetic",
    capabilities: {
      canRevokeSessionKey: false,
      canEnforceOnChainGuards: false,
    },
    start(onEvent: AdapterEventHandler): void {
      if (timer) return;
      timer = setInterval(() => {
        const index = counter++;
        const event: AgentEvent = parseAgentEvent({
          id: randomUUID(),
          timestamp: Date.now(),
          agentId,
          wallet,
          chainId,
          source: "synthetic",
          kind: "tx_send",
          to: recipients[index % recipients.length],
          valueWei: values[index % values.length],
        });
        void onEvent(event);
      }, intervalMs);
    },
    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}
