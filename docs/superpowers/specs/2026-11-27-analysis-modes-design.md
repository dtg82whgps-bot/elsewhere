# Elsewhere analysis modes: design

Date: 2026-11-27
Status: approved by the requester in the request (the spec is treated as the approved design)

## Intent

Let a person choose how to explore a decision: **three possible futures** (positive, negative, mixed narratives) or **pros & cons** (five advantages, five disadvantages). Both must be personal, research-backed, validated, and switchable without re-entering the decision.

## Goals

- Two analysis modes that share one engine, one research layer, and one decision context.
- Exact counts enforced: three scenarios in order positive/negative/mixed; five advantages and five disadvantages with distinct titles.
- Real-world research with citations. Sources are only shown if the search tool actually returned them.
- Mode switching and follow-up questions reuse the decision, profile, and research. No regeneration for each question.
- Works on iOS and Android, phone and tablet. Premium, calm visual language.
- Store-ready: privacy disclosure, AI-data consent, no secrets in the app.

## Non-goals

- Accounts, sync, payments, or saved history across devices (none are needed for v1; adding accounts would bring account-deletion obligations).
- Hardcoded or sample analysis results.

## Anti-goals

- Presenting model output as fact without a source.
- Sending data to the AI provider before the person has agreed.
- Shipping the AI key to the device.

## Approaches considered

1. **Native app plus direct calls to the model from the device.** Rejected: exposes the API key and sends data before consent can be enforced.
2. **Web app wrapped for the stores.** Rejected: weaker store acceptance and worse mobile feel for a premium product.
3. **Expo (React Native) app plus a small Node API that holds the key (chosen).** One codebase for both stores, a server that keeps credentials and enforces validation, and room to add formats later.

## Design

- **Server** (`server/`): Express API with three routes. `/v1/research` runs the shared research layer. `/v1/analyze` runs the engine for a mode and accepts an existing signed research brief so switches are cheap. `/v1/followup` answers a question grounded in the existing analysis.
- **Research layer**: Claude with the web search tool. Every fact must cite a URL. Facts whose URL was not among the retrieved results are dropped. The brief is HMAC-signed so the client cannot alter the research it passes back.
- **Engine**: one system prompt for both modes; each mode in `modes.ts` supplies its instructions, output schema, and token budget. Output is validated with zod before return. One repair attempt with exact validation messages, then a clear error. Nothing unvalidated is returned.
- **Schemas**: `schemas.ts` is the single source of truth. The JSON Schema sent to Claude is generated from it (`json-schema.ts`), with unsupported keywords stripped; the full rules are then enforced on the server.
- **App** (`mobile/`): Expo Router. Home (decision) → optional About you → analysis flow with consent gate, mode picker, results, mode switch, follow-up panel, and in-app privacy and terms.

## Calls made without asking (for review)

- Model: `claude-opus-5-5` by default, as the Claude API reference recommends. Overridable with `ELSEWHERE_MODEL`.
- Server-side fallbacks are enabled on model calls by default, per the reference. Refusals return a clear message.
- Profile is optional and device-local. No account.
- Rate limits are per IP and in-memory (single instance). Move to a shared store before scaling out.
- Follow-ups are plain text answers, not regenerated analyses.
- The "Verified" label means "matched a source the search tool returned", not an independent fact check.

## Left to the builder / owner

- Choosing the real bundle identifiers, hosting provider, and privacy and support addresses (placeholders are in `app.json` and the docs).
- Final icon artwork and store screenshots.
