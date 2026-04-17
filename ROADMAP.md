# Argus Roadmap

## v0 — single-SDK proof of value (Weeks 1–2)

Scope ruthlessly minimal. One adapter, one policy, one dashboard, one alert channel.

- [ ] Coinbase AgentKit adapter: ingest agent transaction events into a normalized schema
- [ ] Policy: daily spend cap enforced off-chain with alerts
- [ ] SQLite event store
- [ ] Minimal dashboard: live tx feed + policy status
- [ ] Discord webhook alert on breach
- [ ] 90-second demo screencap

## v0.1 — first design partner (Weeks 3–4)

- [ ] One Tier C design partner integrated
- [ ] Iterate on their real feedback
- [ ] Public dev log started (weekly)

## v0.2 — second SDK adapter (Month 2)

- [ ] Safe module adapter OR Crossmint adapter — pick based on design partner demand
- [ ] Policy DSL v1: declarative YAML or TS config
- [ ] Policy engine refactored to be adapter-agnostic
- [ ] Contract allowlist policy
- [ ] Rate-limit policy

## v0.3 — kill-switch + multi-chain (Month 3)

- [ ] Cross-chain session-key revocation
- [ ] Anomaly detection (spend spike, unknown contract)
- [ ] Tier B design partner outreach with v0.2 + case study

## v1 — production release (Month 4–6)

- [ ] Audit log export (CSV, Parquet)
- [ ] Hosted dashboard SaaS tier (optional)
- [ ] First paying customer OR major grant secured
- [ ] Public launch thread + ProductHunt

## Grant calendar

- [ ] **EF ESP AI-Powered Protocol Security RFP** — due April 22, 2026
- [ ] Base Builder Grants — rolling
- [ ] Arbitrum Foundation — rolling
- [ ] Optimism RetroPGF — late 2026 (needs traction first)
