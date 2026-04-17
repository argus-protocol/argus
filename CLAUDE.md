# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Argus is an open-source observability and policy layer for onchain AI agents. It is
vendor-neutral by design: it plugs into Coinbase AgentKit, Crossmint, Safe, BNBAgent
SDK, and raw ERC-4337 rather than competing with them. Output is a dashboard, alerts,
and on/off-chain policy enforcement (spend caps, allowlists, rate limits, kill-switch).

The near-term goal is v0: one adapter (AgentKit), one policy (daily spend cap),
SQLite event store, a minimal dashboard, Discord webhook alerts, and a 90-second
demo. See `ROADMAP.md` for milestones.

## Commands

```
npm run dev        # tsx watch — run src/index.ts with live reload
npm run typecheck  # tsc --noEmit
npm run build      # tsc → dist/
npm run start      # node dist/index.js (after build)
```

Node 20+ required. No test framework wired in yet — add one when the first
non-trivial module lands (Vitest is the default pick).

## Architecture (intended)

The codebase is currently a single-package TypeScript project. Keep it that way
until a second adapter is needed; splitting into a pnpm/turbo monorepo is a
refactor, not a rewrite, so defer the cost.

Module boundaries that matter from day one:

- **Adapters** (`src/adapters/*`) — one file per SDK. Each adapter exposes the same
  interface: subscribe to agent events, normalize them into the internal event
  schema, expose capability metadata (can this adapter revoke a session key? can
  it enforce on-chain guards?). Adapters must not leak SDK-specific types beyond
  their own file.
- **Core** (`src/core/*`) — event schema, policy types, policy evaluator. Pure
  functions where possible. No I/O, no chain access.
- **Policies** (`src/policies/*`) — one file per policy kind (spend-cap,
  allowlist, rate-limit, anomaly). Each implements a common `evaluate(event, state)`
  contract.
- **Storage** (`src/storage/*`) — event store + policy-state store. SQLite via
  better-sqlite3 for v0. Keep the interface narrow so Postgres or DuckDB can be
  swapped in later.
- **Alerting** (`src/alerts/*`) — one file per channel (discord, telegram,
  webhook). Each accepts a normalized alert and fires; no channel-specific logic
  leaks into the core.
- **Dashboard** (`src/dashboard/*`) — thin web UI reading from storage. Plain
  HTML + a tiny frontend is fine for v0; do not introduce Next.js/React until the
  UI complexity actually demands it.

The rule: if adding a new SDK adapter requires touching anything outside
`src/adapters/`, the boundary is wrong — fix it before the second adapter lands.

## Planned dependencies (add as needed, not preemptively)

- `viem` for EVM RPC / event decoding
- `better-sqlite3` for local event store
- `hono` or `fastify` for the dashboard HTTP layer
- `zod` for event-schema and policy-config validation

Do not install any of these until the first concrete use lands. Minimal deps is
a feature, not an accident.

## Conventions

- **MIT-licensed OSS**, built in public. Treat every commit and comment as
  publicly visible.
- **Ship ugly, ship often.** Polish is v2. v0 is about one real user seeing the
  value.
- **One SDK deep before two SDKs shallow.** Do not add the second adapter until
  AgentKit works end-to-end with a design partner.
- **No backwards-compatibility shims** during v0 — the surface is not public
  yet, so breaking changes are free. Rename aggressively.
- **No token, no on-chain Argus contract yet.** Revisit only if a concrete
  technical need appears (e.g., trust-minimized kill-switch).

## Critical near-term dates

- **April 22, 2026** — Ethereum Foundation ESP "AI-Powered Protocol Security"
  RFP deadline. Submitting a proposal for Argus is the highest-leverage action
  in the project's first month.
