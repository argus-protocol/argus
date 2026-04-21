import type { AgentEvent } from "../core/events.js";
import type { Policy, PolicyEvaluation } from "../core/policies.js";

export interface SpendCapConfig {
  readonly id: string;
  readonly capWeiPerDay: bigint;
  readonly walletAddress?: string;
}

export interface SpendCapState {
  readonly dailyTotalsWei: Record<string, string>;
}

export const SPEND_CAP_KIND = "spend-cap";

function utcDayKey(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

export function createSpendCapPolicy(
  config: SpendCapConfig,
): Policy<SpendCapState> {
  const scopedWallet = config.walletAddress?.toLowerCase();

  return {
    id: config.id,
    kind: SPEND_CAP_KIND,

    initialState(): SpendCapState {
      return { dailyTotalsWei: {} };
    },

    evaluate(
      event: AgentEvent,
      state: SpendCapState,
    ): PolicyEvaluation<SpendCapState> {
      if (event.kind !== "tx_send") {
        return { state, decision: { verdict: "pass" } };
      }
      if (scopedWallet && event.wallet.toLowerCase() !== scopedWallet) {
        return { state, decision: { verdict: "pass" } };
      }

      const value = BigInt(event.valueWei);
      if (value === 0n) {
        return { state, decision: { verdict: "pass" } };
      }

      const dayKey = utcDayKey(event.timestamp);
      const previous = BigInt(state.dailyTotalsWei[dayKey] ?? "0");
      const next = previous + value;

      const nextState: SpendCapState = {
        dailyTotalsWei: {
          ...state.dailyTotalsWei,
          [dayKey]: next.toString(),
        },
      };

      if (next > config.capWeiPerDay) {
        return {
          state: nextState,
          decision: {
            verdict: "alert",
            severity: "critical",
            reason:
              `Daily spend cap breached on ${dayKey}: ` +
              `${next.toString()} wei spent, cap ${config.capWeiPerDay.toString()} wei`,
          },
        };
      }

      return { state: nextState, decision: { verdict: "pass" } };
    },
  };
}
