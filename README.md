# Argus

**Open-source observability and policy layer for onchain AI agents.**

Cross-SDK. Vendor-neutral. Self-hostable. MIT-licensed.

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Status](https://img.shields.io/badge/status-v0%20%E2%80%94%20early-orange.svg)](#status)
[![Built in public](https://img.shields.io/badge/built-in%20public-blue.svg)](https://github.com/argus-protocol/argus/commits/main)

---

## The gap Argus fills

Account abstraction is now production-grade. ERC-4337 bundlers, ERC-7579
modular smart accounts, and EIP-7702 delegations power hundreds of thousands
of smart accounts that increasingly operate *semi-autonomously* — driven not
by humans, but by AI agents.

The tooling for **issuing and executing** their transactions is strong:
AgentKit, Crossmint, Safe modules, Privy, Turnkey, Openfort. The tooling for
**observing, constraining, and stopping** them at runtime is missing.

Every agent SDK ships its own session-key model, its own spending limits,
its own audit log. None interoperate. None expose a neutral runtime view
across an operator's portfolio of agents. None offer a coordinated kill-switch
that works across providers.

Argus is the layer that sits on top of all of them.

## What Argus does

- **Adapters** normalize agent activity across Coinbase AgentKit, Crossmint,
  Safe modules (ERC-7579), BNBAgent SDK, and raw ERC-4337 UserOperation streams
  into a single internal event schema.
- **Declarative policies** — spend caps, contract allowlists, rate limits,
  anomaly thresholds — expressed as config, not code. Add a policy without
  writing a new file per agent.
- **Pluggable alerting** routes policy breaches to Discord, Telegram, webhooks,
  or email. Channel-specific logic never leaks into the policy layer.
- **Cross-chain kill-switch.** Revoke session keys atomically across multiple
  chains and providers, in a single coordinated action.
- **Immutable audit log** of every autonomous action, replayable for
  post-mortem and policy simulation.
- **Reference ERC-7579 hook modules** (roadmap) express the same policy
  primitives at the smart-account boundary, giving operators a choice
  between off-chain monitoring and on-chain enforcement.

## Architecture

```
   Adapters
   AgentKit · Crossmint · Safe · BNBAgent · ERC-4337 raw
       │
       │  normalized event schema
       ▼
   Core
   event schema · policy types · evaluator (pure, no I/O)
       │
       │  policy decision
       ▼
   Policies
   spend-cap · allowlist · rate-limit · anomaly
       │
       ├──▶  Storage     (SQLite, local-first; Postgres later)
       ├──▶  Alerting    (Discord · Telegram · webhook · email)
       └──▶  Kill-switch (revoke session keys across providers)
```

The rule: **adding a new SDK adapter must never require changes outside
`src/adapters/`.** If it does, the boundary is wrong — fix it before the next
adapter lands.

See [CLAUDE.md](./CLAUDE.md) for full module-boundary discipline.

## Status

**v0 — under active development.** The repo is newly public and the first
release is a work in progress. The architecture, module boundaries, and
milestone plan are committed; the first adapter is the current focus.

Follow the [commit history](https://github.com/argus-protocol/argus/commits/main)
for live progress, or the [dev log](./docs/devlog/) for written updates
alongside each milestone.

## Roadmap

Full breakdown in [ROADMAP.md](./ROADMAP.md). Summary:

| Milestone | Target | Scope |
|-----------|--------|-------|
| **v0** | End of month 2 | AgentKit adapter · spend-cap policy · SQLite store · minimal dashboard · Discord alerts · 1 external integrator |
| **v0.2** | End of month 3.5 | Second SDK adapter (Safe or Crossmint, chosen by integrator demand) · declarative policy DSL · allowlist + rate-limit policies · 3 external integrators |
| **v1** | End of month 5 | Cross-chain session-key revocation · anomaly-detection policy · reference ERC-7579 hook contract · 5 external integrators · production case study |

Each milestone is gated on **real external integrators**, not just shipped
code. The project does not advance to milestone N until milestone N's
integrator targets are met.

## Design partners wanted

If you run onchain agents — yield rotators, trading bots, payment agents,
chat agents, DAO ops, anything agentic on AgentKit, Safe, Crossmint, or raw
ERC-4337 — I'd like to talk.

**What you get:**
- Priority influence on roadmap and API shape
- Early access to v0 ahead of public release
- Direct line to the maintainer for incidents and feature requests
- Named mention in the design-partner thank-you (if you want it)
- **Free forever** for design partners — no hosted tier, no paid tier, no
  "pro features" held back

**What I need:**
- A 30-minute intro call
- Roughly 1 hour per month of feedback while v0 ships
- Permission to reference your use case (anonymised if preferred)

Reach out: **argus.watch@proton.me**

## Project principles

- **MIT-licensed throughout the grant period and beyond.**
- **Local-first, self-hostable.** No SaaS dependency, no required third-party
  services, no "free tier that quietly degrades."
- **No token.** Not planned, not teased, not a "future possibility."
- **No SaaS or commercial offering during grant periods.** If one ever
  happens, it'll be an opt-in supplement to the free self-hostable version —
  never features locked behind it.
- **All design documents, architecture decisions, and post-mortems published
  openly** in this repository.
- **Built in public.** The commit history is the receipt.

## Contributing

Contributions welcome. For v0, the highest-value ways to help:

- **Report a concrete use case.** If you operate agents and have seen policy
  gaps or tooling that failed, open an issue — real incidents shape design
  better than any whiteboard session.
- **Propose an adapter.** If you maintain or use a smart-account SDK not yet
  listed, open an issue describing its event model. Adapter authoring docs
  are a Milestone 2 deliverable.
- **PRs:** please open an issue before sending non-trivial patches, so
  architectural intent can be aligned first.

## Funding

Seeking the **Ethereum Foundation ESP Wishlist** grant under *"Existing
Tooling for Ethereum Developers"* — account-abstraction infrastructure
category. Application pending; public milestone plan is the one committed
here.

If Argus is useful to you and you can sponsor development directly, open an
issue tagged `sponsorship` or email the address above.

## Author

Kristiyan Petrov — solo maintainer, building part-time alongside a separate
full-time role.

- Email: **argus.watch@proton.me**
- Farcaster: [@arguswatchhq](https://warpcast.com/arguswatchhq)
- LinkedIn: [linkedin.com/in/kristiyan-petrov-zontak](https://www.linkedin.com/in/kristiyan-petrov-zontak/)

## License

[MIT](./LICENSE) — copyright 2026 Kristiyan Petrov.
