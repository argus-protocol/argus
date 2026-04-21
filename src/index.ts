import { createSyntheticAdapter } from "./adapters/synthetic.js";
import { createSpendCapPolicy } from "./policies/spend-cap.js";
import { runPolicy, type PolicyAlert } from "./core/policies.js";
import type { AgentEvent } from "./core/events.js";
import { createSqliteStore } from "./storage/sqlite.js";
import { createConsoleAlerter } from "./alerts/console.js";
import type { SpendCapState } from "./policies/spend-cap.js";

const DB_PATH = process.env.ARGUS_DB ?? "argus.sqlite";
const CAP_WEI = 1_000_000_000_000_000_000n; // 1 ETH / day

async function main(): Promise<void> {
  const store = createSqliteStore(DB_PATH);
  const alerter = createConsoleAlerter();

  const policy = createSpendCapPolicy({
    id: "spend-cap-demo",
    capWeiPerDay: CAP_WEI,
  });

  let policyState =
    (store.getPolicyState(policy.id) as SpendCapState | null) ??
    policy.initialState();

  const adapter = createSyntheticAdapter({ intervalMs: 1000 });

  const handle = (event: AgentEvent): void => {
    store.appendEvent(event);
    const { state, alert } = runPolicy(policy, event, policyState);
    policyState = state;
    store.putPolicyState(policy.id, policyState);
    if (alert) {
      store.appendAlert(alert);
      void fireAlert(alerter.fire.bind(alerter), alert);
    }
  };

  adapter.start(handle);

  process.stdout.write(
    `Argus v0 running — adapter=${adapter.name}` +
      ` policy=${policy.kind}:${policy.id}` +
      ` cap=${CAP_WEI.toString()} wei/day db=${DB_PATH}\n`,
  );

  const shutdown = (): void => {
    adapter.stop();
    store.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function fireAlert(
  fire: (alert: PolicyAlert) => Promise<void> | void,
  alert: PolicyAlert,
): Promise<void> {
  try {
    await fire(alert);
  } catch (err) {
    process.stderr.write(`alerter failed: ${String(err)}\n`);
  }
}

void main().catch((err: unknown) => {
  process.stderr.write(`fatal: ${String(err)}\n`);
  process.exit(1);
});
