import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import {
  AgentKit,
  ViemWalletProvider,
  walletActionProvider,
} from "@coinbase/agentkit";

import { createAgentKitAdapter } from "../src/adapters/agentkit.js";
import { createSpendCapPolicy, type SpendCapState } from "../src/policies/spend-cap.js";
import { runPolicy } from "../src/core/policies.js";
import { createSqliteStore } from "../src/storage/sqlite.js";
import { createConsoleAlerter } from "../src/alerts/console.js";
import { createDiscordAlerter } from "../src/alerts/discord.js";
import type { Alerter } from "../src/alerts/alerter.js";
import type { AgentEvent } from "../src/core/events.js";

const ANVIL_PORT = 18545;
const ANVIL_HOST = "127.0.0.1";
// Anvil default mnemonic, account #0 — 10000 ETH pre-funded.
const DEV_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const RECIPIENT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // anvil #1
const DB_PATH = process.env.ARGUS_DB ?? "argus-demo.sqlite";
const CAP_WEI = 1_000_000_000_000_000_000n; // 1 ETH / day

function findAnvilBinary(): string {
  const candidates = [
    process.env.ANVIL_BIN,
    join(homedir(), ".foundry", "bin", "anvil.exe"),
    join(homedir(), ".foundry", "bin", "anvil"),
    "/usr/local/bin/anvil",
  ].filter((p): p is string => typeof p === "string" && p.length > 0);
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      `anvil not found. Set ANVIL_BIN or install Foundry. Tried: ${candidates.join(", ")}`,
    );
  }
  return found;
}

async function startAnvil(): Promise<ChildProcess> {
  const bin = findAnvilBinary();
  process.stdout.write(`[demo] starting anvil at ${bin} on ${ANVIL_HOST}:${ANVIL_PORT}\n`);
  const child = spawn(bin, [
    "--host", ANVIL_HOST,
    "--port", String(ANVIL_PORT),
    "--chain-id", "31337",
    "--silent",
  ], { stdio: ["ignore", "pipe", "pipe"] });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("anvil startup timed out after 15s"));
    }, 15000);

    const onStdout = (buf: Buffer): void => {
      const s = buf.toString();
      if (s.includes(`Listening on ${ANVIL_HOST}:${ANVIL_PORT}`) || s.includes("Listening on")) {
        clearTimeout(timeout);
        child.stdout?.off("data", onStdout);
        resolve(child);
      }
    };
    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", (buf) => process.stderr.write(`[anvil] ${buf.toString()}`));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) reject(new Error(`anvil exited early with code ${code}`));
    });

    // --silent suppresses the "Listening on" banner; fall back to a short probe.
    setTimeout(() => {
      clearTimeout(timeout);
      child.stdout?.off("data", onStdout);
      resolve(child);
    }, 1500);
  });
}

async function main(): Promise<void> {
  const anvil = await startAnvil();
  let exitCode = 0;

  try {
    const account = privateKeyToAccount(DEV_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: foundry,
      transport: http(`http://${ANVIL_HOST}:${ANVIL_PORT}`),
    });
    const innerProvider = new ViemWalletProvider(walletClient, {
      rpcUrl: `http://${ANVIL_HOST}:${ANVIL_PORT}`,
    });

    const { walletProvider, adapter } = createAgentKitAdapter({
      agentId: "demo-agent-1",
      inner: innerProvider,
      source: "agentkit-demo",
    });

    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [walletActionProvider()],
    });

    const store = createSqliteStore(DB_PATH);
    const alerters: Alerter[] = [createConsoleAlerter()];
    const discordUrl = process.env.DISCORD_WEBHOOK_URL;
    if (discordUrl) {
      alerters.push(createDiscordAlerter({ webhookUrl: discordUrl }));
      process.stdout.write("[demo] discord alerter enabled\n");
    }
    const policy = createSpendCapPolicy({
      id: "spend-cap-demo",
      capWeiPerDay: CAP_WEI,
    });
    let policyState =
      (store.getPolicyState(policy.id) as SpendCapState | null) ??
      policy.initialState();

    adapter.start((event: AgentEvent) => {
      store.appendEvent(event);
      const { state, alert } = runPolicy(policy, event, policyState);
      policyState = state;
      store.putPolicyState(policy.id, policyState);
      process.stdout.write(
        `[event] ${event.kind} to=${event.kind === "tx_send" ? event.to : "-"} ` +
          `value=${event.kind === "tx_send" ? event.valueWei : "-"} wei\n`,
      );
      if (alert) {
        store.appendAlert(alert);
        for (const a of alerters) {
          Promise.resolve(a.fire(alert)).catch((err: unknown) => {
            process.stderr.write(`[demo] alerter ${a.name} failed: ${String(err)}\n`);
          });
        }
      }
    });

    process.stdout.write(
      `[demo] wallet=${walletProvider.getAddress()} ` +
        `chainId=${walletProvider.getNetwork().chainId} ` +
        `cap=${CAP_WEI.toString()} wei/day\n`,
    );

    const nativeTransfer = agentkit
      .getActions()
      .find((a) => a.name.endsWith("native_transfer"));
    if (!nativeTransfer) {
      throw new Error("native_transfer action not found on AgentKit surface");
    }

    const amounts = ["0.1", "0.25", "0.5", "1.0"];
    for (const value of amounts) {
      process.stdout.write(`[demo] action native_transfer → ${value} ETH to ${RECIPIENT}\n`);
      const result = await nativeTransfer.invoke({ to: RECIPIENT, value });
      process.stdout.write(`[demo]   result: ${result.slice(0, 96)}${result.length > 96 ? "…" : ""}\n`);
      await new Promise((r) => setTimeout(r, 50));
    }

    await new Promise((r) => setTimeout(r, 200));

    const recentEvents = store.recentEvents(10);
    const recentAlerts = store.recentAlerts(10);
    process.stdout.write(
      `\n[demo] stored events: ${recentEvents.length} · stored alerts: ${recentAlerts.length}\n`,
    );

    adapter.stop();
    store.close();
  } catch (err) {
    process.stderr.write(`[demo] error: ${String(err)}\n`);
    exitCode = 1;
  } finally {
    anvil.kill();
    await new Promise((r) => setTimeout(r, 200));
    process.exit(exitCode);
  }
}

void main();
