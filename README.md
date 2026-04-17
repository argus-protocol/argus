# Argus

Open-source observability and policy layer for onchain AI agents.

Cross-SDK. Vendor-neutral. MIT-licensed.

## Why this exists

Over 500,000 agent wallets are live onchain. More than $600M in autonomous agent
transaction volume has already moved through x402 alone. Yet there is no
standardized way to monitor agents, enforce spending policies, or stop them when
they misbehave. Every SDK reinvents these primitives badly, and nothing works
across providers.

Argus is the missing layer.

## What it does

- Reads agent activity across Coinbase AgentKit, Crossmint, Safe, BNBAgent SDK,
  and raw ERC-4337
- Enforces declarative policies: spend caps, contract allowlists, rate limits,
  anomaly thresholds
- Real-time alerts on policy breach (Discord, Telegram, webhook)
- Cross-chain kill-switch: revoke session keys everywhere atomically
- Immutable audit log of every autonomous action

## Status

v0 — under active development. Building in public.

## Looking for design partners

If you run onchain agents — yield rotators, trading bots, chat agents, DAO
ops — I'd love your feedback on the early version. Free forever for design
partners.

## License

MIT
