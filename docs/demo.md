# Argus v0 demo: 90 seconds against a local anvil

This is what you see when `npm run demo:agentkit` fires: a real
AgentKit surface, four `native_transfer` actions through it, and a
1 ETH/day spend cap tripping on the fourth.

## What you need

- Node 20+
- Foundry (`anvil`) on PATH or at `~/.foundry/bin/anvil`

```
git clone https://github.com/argus-protocol/argus
cd argus
npm install
npm run demo:agentkit
```

## What runs

The script spawns a local anvil chain, builds a real `AgentKit`
instance with a `walletActionProvider`, and wraps the underlying
viem wallet provider with `ArgusWalletProvider`. Every
`sendTransaction` the agent makes flows through the policy pipeline
before returning.

The policy is a daily spend cap of 1 ETH on native ETH outflow,
keyed per UTC day.

## What you see

```
[demo] starting anvil at C:\Users\User\.foundry\bin\anvil.exe on 127.0.0.1:18545
[demo] wallet=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 chainId=31337 cap=1000000000000000000 wei/day

[demo] action native_transfer → 0.1 ETH to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
[event] tx_send to=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 value=100000000000000000 wei
[demo]   result: Transferred 0.1 ETH to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Transaction hash: 0xc5f5f24998…

[demo] action native_transfer → 0.25 ETH to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
[event] tx_send to=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 value=250000000000000000 wei
[demo]   result: Transferred 0.25 ETH to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Transaction hash: 0xe103daaac…

[demo] action native_transfer → 0.5 ETH to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
[event] tx_send to=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 value=500000000000000000 wei
[demo]   result: Transferred 0.5 ETH to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Transaction hash: 0x993a1f7005…

[demo] action native_transfer → 1.0 ETH to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
[event] tx_send to=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 value=1000000000000000000 wei

[ARGUS CRITICAL] 2026-04-27T14:48:14.941Z policy=spend-cap:spend-cap-demo
  wallet=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 agent=demo-agent-1 chain=31337 event=tx_send:f74484ed
  reason: Daily spend cap breached on 2026-04-27: 1850000000000000000 wei spent, cap 1000000000000000000 wei

[demo]   result: Transferred 1.0 ETH to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Transaction hash: 0xa8d4e265eb…

[demo] stored events: 4 · stored alerts: 1
```

The fourth `native_transfer` pushes cumulative spend to 1.85 ETH and
the alerter fires. The transaction itself still broadcasts: v0 is
observe-only. The synchronous gate (throw from `sendTransaction` on
policy block) lands in v0.3, where the contract around the gate
matters more than the gate itself. Custom error type for LangChain
and Vercel AI SDK to surface to the LLM cleanly. `ARGUS_ENFORCE=false`
escape hatch. Timeout guards on policy evaluation. Tests that assert
"tx NOT broadcast" rather than just "alert fired."

## What happens behind the scenes

- The observation seam is the wallet boundary, not the action
  boundary. Whether the agent calls a registered AgentKit action,
  raw viem, or a LangChain tool, every broadcast goes through
  `sendTransaction` and produces a normalized `tx_send` event.
- Events are validated at ingress (zod discriminated union on
  `kind`) and persisted in SQLite. The same `tx_send` row drives the
  alert and the dashboard.
- The policy is a pure function `evaluate(event, state) -> {state,
  decision}`. No I/O. State (current day's cumulative spend) is
  rehydrated from the store on the next tx.

## Dashboard

Run `npm run dashboard` in a second terminal and open
`http://127.0.0.1:4317`. Three pages:

- Fleet view: agent list with 24h tx count, spend, alert count, last
  seen.
- Agent detail: events and alerts feed for that agent.
- Alerts feed: global; deep-linkable `/alerts/:id` entries that
  Discord embeds point at directly so on-call can triage from
  mobile.

Card stack below the `sm:` breakpoint, table layout above.

## Discord

Set `DISCORD_WEBHOOK_URL` and re-run `npm run demo:agentkit`. The
fourth tx fires a severity-coloured embed alongside the console
line, with a clickable link to `/alerts/:id` on the local dashboard.

## What's next

The demo is single-process, single-policy, single-adapter. That's
v0 Milestone 1's vertical slice. See [ROADMAP.md](../ROADMAP.md) for
v0.1 (first design partner), v0.2 (second SDK adapter, ERC20
calldata decode, action-level observation layer), and v0.3
(synchronous gate, ERC-7579 reference hook, kill-switch).

Looking for one design partner: builder with a live onchain agent
who'd run a spend-cap policy and tell me what's wrong with it.
argus.watch@proton.me.
