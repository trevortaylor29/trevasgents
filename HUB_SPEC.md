# Trevs Agents Hub — spec (v1, 2026-10-14)

**One line:** the place a member's own agents report to and act through. Holliday's body (connectors, hands, approvals, alerts, schedules, UI) without her brain. Included in the Inner Circle; no AI cost to us; the member's agents think on the member's keys or subscriptions.

**Decisions taken (Trevor, 2026-10-14):** included in the membership, not a tier; no Holliday brain inside it, nothing extra to pay for. Zapier tasks are billed to the member's own Zapier account, as they are in Holliday.

## Why
Members take the playbook, build their operation in a weekend and leave (median 1.15 months; builder users churn *more*, 29% vs 37% at month 2). The hub gives a running operation something it wants every week: approvals, logs, alerts and connectors live here, while the agents keep running on the member's machine without us. Honest dependence: the value renews, the files do not.

## What a member gets
1. **Agents page:** every agent that has ever reported in: name, last seen, runs today, last error, money reported. Quiet-for-24h and failing agents are flagged.
2. **Runs feed:** each run an agent posts (what it did, in its words, with numbers), newest first. The Ship Comms pattern from Mission Control, per member.
3. **Approvals:** actions an agent proposes (post this, send this, add this row, email this) wait on a Yes/No card. Executed through the member's own Zapier MCP server or our destinations (Slack, Discord, email, phone push, webhook). Money systems refused by name, same rule as Holliday.
4. **Connectors:** the Holliday catalogue (Gumroad, Stripe, Shopify, PayPal, YouTube, Sheets/Docs, Notion, Airtable, Postgres, files, synced folder…). Agents read them through the API instead of each agent carrying its own keys.
5. **Alerts and schedules:** "DM me if Scout is silent for a day", "ping my Etsy agent every morning at 7", "email me the week on Monday".
6. **Weekly email:** what the operation did, what it earned, what broke. No model: a template over the runs feed and the connector numbers.

## Agent API (member key = the builder's `tk-` key; base `https://hub.trevsagents.com/v1`)
| Call | Does |
|---|---|
| `POST /agents/register {name, role, version}` | first contact; returns agent id |
| `POST /runs {agent, summary, numbers?, level: info\|warn\|error}` | one line per run, the feed + alerting read this |
| `GET /data/:connector` | a read (same snapshot shapes as Holliday: `coverage`, series, rows) |
| `POST /actions {agent, tool, args, label}` | PROPOSE a write; card appears in Approvals; `GET /actions/:id` polls the verdict; executed by us on Yes |
| `POST /send {destination, text, attachments?}` | deliver to a listed place (Slack/Discord/email/push/webhook) |
| `GET /inbox` | what the member typed for this agent in the UI ("pause", "focus on candles"), so agents can take direction |
| `POST /heartbeat` | optional; a quiet agent is one with no heartbeat or run in 24 h |

Keys: a member key is scoped to the member's workspace only; one agent cannot see another member's anything (tenant isolation is the Holliday worker's RLS, reused). Rate limits per key. Every call is an `audit_events` row.

## Build plan (reuse first)
- **Service:** a second mode of `holliday-worker` (same code, `HUB_MODE=1`, own port + domain `hub.trevsagents.com`), or a thin sibling service importing its libs: tenants, Supabase auth, `secrets` (AES-GCM keys), `connectors/*`, `mcp.js`, `send.js`, `schedules.js`, `watchers.js`, `audit`. New: `agents`, `runs`, `actions` tables (3 migrations), the member-key bridge (`builder.db` email+key → tenant), the agent API routes, the weekly email template.
- **Site:** `trevsagents.com/hub` pages: Agents, Runs, Approvals, Connectors (lifted from Holliday's settings grid), Alerts, Destinations. Builder session already authenticates the member; reuse it.
- **Library:** every agent template gets a 12-line "report in" block (register, runs, propose) and a `trevs hub` snippet in the builder's generated instructions, so new builds are wired by default. Existing members get a one-paste upgrade line.
- **First wired agents:** Scout (problem hunter: posts each find as a run), Matt (ops summary), and the two new ones below.

## Phases
1. **Week 1:** tables, member-key bridge, `register/runs/heartbeat`, Agents + Runs pages, quiet/failing alert to Discord DM. Demo: Scout reporting into a member hub.
2. **Week 2:** `actions` + Approvals card (via the member's Zapier MCP), `send`, Connectors page, `GET /data`.
3. **Week 3:** schedules, weekly email, library wiring + builder instructions, announcement.
Acceptance: a brand-new member runs the builder, their first agent appears on the hub within one run, proposes one action, they approve it from their phone, and the Monday email arrives.

## Costs
No model calls. Supabase rows (~2 KB per run), Resend email (free to 3k/mo), Zapier on the member. Hosting on the existing box. Worst case per member ≈ cents/month.

## Not in v1
No brain, no hosted model, no "ask the hub a question". No mobile app (the pages are phone-sized). No marketplace. Nothing that charges the member.

## Status
- **2026-10-14 (later) — Reframed + approvals live:** Trevor: "they dont need just some other dashboard to see and manage their agents, thats not what this was supposed to be for" and "make it real and viable and useful". The hub leads with ask-before-acting approvals (`POST /v1/actions` → Yes/Not now on the page or a Discord DM → the agent polls the verdict and acts on its own machine → `/done`), with reporting, direction and alerts behind it. Pages rebuilt in the "studio floor" look (his pick), only real data, Studio tab removed until the Studio exists. Lapsed-membership lockout verified on 123 accounts; the hub fails closed on an unreadable ledger.
- **2026-10-14 — Phase 1 live:** `hub-worker` at hub.trevsagents.com (register / runs / heartbeat / inbox / me; UI overview, runs, inbox, remove, settings), Discord DM alerts for quiet and failing agents, pages at trevsagents.com/hub (Agents, Runs, Studio preview, Add an agent, Alerts), Hub link in the builder. Decisions since v1: no auto-posting in the Studio's first version (download + caption, the member posts); the Studio takes screenshots and links as references; the hub UI is its own, in the builder's visual language, not Holliday's.
