# Argus Roadmap

## v0 — single-SDK proof of value (Weeks 1–2)

Scope ruthlessly minimal. One adapter, one policy, one dashboard, one alert channel.

- [x] Internal event schema (zod, discriminated union on `kind`)
- [x] Synthetic adapter for demo / integration testing
- [x] SQLite event + policy-state + alerts store (WAL mode)
- [x] Daily spend-cap policy (native ETH, UTC-day key)
- [x] Console alerter
- [x] Docker + docker-compose for local-host deploy
- [x] Coinbase AgentKit adapter — β seam (wrap `EvmWalletProvider`), observe-only
- [x] Local anvil-based integration test harness (no CDP keys required) — `scripts/demo-agentkit.ts`
- [x] Discord webhook alerter
- [x] Minimal dashboard: Fleet / Agent / Alerts pages with SSE live refresh (hono + SSR HTML + Tailwind CDN; JSON API from day 1 so SPA swap is frontend-only)
- [x] Public demo walkthrough — [`docs/demo.md`](./docs/demo.md), reproducible end-to-end run with real output
- [x] First public dev log entry — [`docs/devlog/2026-04-22-v0-m1-shipped.md`](./docs/devlog/2026-04-22-v0-m1-shipped.md)

Explicit deferrals for v0.2+: calldata decode for ERC20, action-level α layer,
synchronous policy gate, off-chain signature parsing. See
`private/design-deferred.md` for the full list and rationale.

## v0.1 — first design partner (Weeks 3–4)

- [ ] One Tier C design partner integrated
- [ ] Iterate on their real feedback
- [x] Public dev log started — [`docs/devlog/`](./docs/devlog/) (first entry shipped; cadence is "material over schedule")

## v0.2 — second SDK adapter (Month 2)

- [ ] Safe module adapter OR Crossmint adapter — pick based on design partner demand
- [ ] Policy DSL v1: declarative YAML or TS config
- [ ] Policy engine refactored to be adapter-agnostic
- [ ] Contract allowlist policy
- [ ] Rate-limit policy
- [ ] **Calldata decode** (ERC20 transfers + approves) so allowlist and spend-cap work on token outflows, not just native ETH
- [ ] **α action-level layer** for AgentKit adapter — semantic context for allowlist / anomaly policies

## v0.3 — kill-switch + multi-chain (Month 3)

- [ ] Cross-chain session-key revocation
- [ ] Anomaly detection (spend spike, unknown contract)
- [ ] **Synchronous policy gate** — `ArgusWalletProvider.sendTransaction` throws on policy block, custom error surface for LangChain/Vercel, `ARGUS_ENFORCE` escape hatch
- [ ] **ERC-7579 hook module** — on-chain expression of one policy primitive (reference implementation)
- [ ] **Off-chain signature parsing** — Permit2 / EIP-7702 / EIP-712 session-key authorizations intercepted at `signTypedData`
- [ ] Tier B design partner outreach with v0.2 + case study

## v1 — production release (Month 4–6)

- [ ] Audit log export (CSV, Parquet)
- [ ] Hosted dashboard SaaS tier (optional)
- [ ] First paying customer OR major grant secured
- [ ] Public launch thread + ProductHunt

