# JobPilot: AI job-search automation

Upload a resume once. JobPilot finds jobs that fit, finds the founder / CTO / hiring manager, verifies their email, writes a personal cold email that ties your best project to their product, sends it from **your own** Gmail or Outlook at a good time in their time zone, follows up on day 3 / 7 / 14, sorts the replies, and tracks everything to the offer.

**Stack:** Node.js + TypeScript (Express 5, Drizzle ORM, PostgreSQL, BullMQ on Redis) for the API · Next.js 16 + TypeScript + Tailwind CSS 4 for the web app · Claude (Anthropic SDK) for AI · a Manifest V3 Chrome extension.

```
apps/
  api/        Node + TS API, background worker, Postgres schema + migrations
  web/        Next.js app (App Router), proxies /api/* to the API
  extension/  Chrome extension (one-click capture + draft)
packages/
  shared/     Pure TS logic shared by API and web: scoring, dedupe, scam & spam checks,
              email patterns, time zones, warm-up, reply classification, analytics insights
```

## Quick start

Requirements: Node 20+, pnpm, PostgreSQL 16, Redis 7 (or `docker compose up -d`).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env     # defaults work for local dev
docker compose up -d                        # Postgres + Redis (skip if you run them yourself)
pnpm db:migrate
pnpm db:seed                                # demo account: demo@jobpilot.dev / demo12345
pnpm dev                                    # API :4000, worker, web :3000
```

Open http://localhost:3000. Without any API keys, everything works using rule-based fallbacks, and the **dev mailbox** (Settings → "Add dev mailbox") captures emails instead of sending them, so you can try the full flow safely. Add `ANTHROPIC_API_KEY` to switch every AI feature to Claude.

Without Redis you can still run sending and reminders inside the API: `RUN_SCHEDULER_INLINE=true pnpm --filter @jobpilot/api dev`.

## Tests

```bash
pnpm test                                   # shared (27) + API (67) + extension (3)
pnpm --filter @jobpilot/api test            # needs Postgres; uses database jobpilot_test
pnpm test:e2e                               # 10 Playwright tests against a running stack (seed first)
```

The API suite runs the real HTTP app against a real Postgres. It covers signup, resume parsing, discovery dedupe, scam filtering, match ranking, contact email guessing, drafting, approval, sending with tracking, opens, free-plan limits, autopilot campaigns, follow-up scheduling, random gaps, daily limits, one-click pause, reply classification, stopping sequences, bounces, suppression, the kanban board, prep packs, analytics, public profiles, extension capture, the college plan, unsubscribe and webhooks. Outbound network calls are switched off in tests (`OFFLINE=true`). Regression tests cover real PDF parsing, SSRF blocking, auth rate limits, one-click unsubscribe, resume attachments and follow-up timing.

## Feature map

| # | Feature | Where |
|---|---------|-------|
| 1 | Resume PDF → skills, projects, experience, education (Claude reads the PDF; text parser fallback) | `api/services/resume.ts`, `shared/resumeParser.ts` |
| 1 | GitHub (repos, languages, topics), portfolio, LinkedIn link | `api/services/enrich.ts` |
| 1 | Fresher/experienced, years, target roles, work mode, cities, stipend/CTC, company size, industries, employment type | onboarding: `web/app/onboarding`, `api/routes/profile.ts` |
| 1 | Writing-style sample → style profile used by the writer | `enrich.ts` (`analyzeWritingStyle`), `writer.ts` |
| 2 | Greenhouse, Lever, Ashby, Workable, Remotive, RemoteOK, HN "Who's Hiring", YC hiring companies, X hiring posts | `api/services/discovery/sources.ts` |
| 2 | Funding news (TechCrunch, Crunchbase News, Inc42 RSS) → "newly funded" flags | `sources.ts` (`parseFundingRss`), dashboard |
| 2 | Cross-platform dedupe, 0–100 match score with reasons, daily feed, scam detection | `shared/dedupe.ts`, `shared/scoring.ts`, `shared/scam.ts`, `discovery/index.ts` |
| 3 | People finder: website team pages, GitHub org members, job posts, optional Apollo / Hunter | `api/services/people.ts` |
| 3 | Email pattern detection (from commit emails / known addresses), candidates, MX + SMTP verification, confidence | `shared/emailPatterns.ts`, `api/services/emailVerify.ts` |
| 3 | Recent posts (GitHub, blog RSS, X), company research card (product, stack, news, size) | `people.ts` (`fetchRecentPosts`), `research.ts` |
| 4 | Personalised emails, best-project matching, 3 tones, 3–5 subjects, A/B, spam checker, tailored resume link, LinkedIn notes/DMs, cover letters | `api/services/writer.ts`, `shared/templates.ts`, `shared/spam.ts`, `/p/[slug]?for=<job>` |
| 5 | Gmail / Outlook OAuth sending, recipient-time-zone scheduling, day 3/7/14 follow-ups that stop on reply, daily limits, random gaps, approval vs autopilot, bulk campaigns, one-click pause | `api/services/mail/providers.ts`, `api/services/sequencer.ts`, `shared/timezone.ts`, `shared/sending.ts` |
| 6 | SPF / DKIM / DMARC checks + setup guides, warm-up ramp, bounce handling + suppression list, inbox placement tests, health score | `api/services/deliverability.ts`, `replies.ts`, `web/app/(app)/deliverability` |
| 7 | Gmail Pub/Sub and Outlook Graph webhooks, reply classification, suggested replies, Cal.com / Google Calendar links, push + WhatsApp notifications | `api/routes/inbox.ts`, `api/services/replies.ts`, `notify.ts` |
| 8 | Kanban (Found → Emailed → Replied → Interview → Offer → Rejected), notes, reminders, timeline, manual applications | `api/routes/crm.ts`, `web/app/(app)/tracker` |
| 9 | Interview prep pack (company brief, likely questions, STAR stories from your projects, questions to ask), stipend/salary negotiation tips | `api/services/prep.ts` |
| 10 | Open / reply rates per template, subject, role, company size, contact role, tone, step; A/B significance; weekly report; AI suggestions | `api/services/analytics.ts`, `shared/insights.ts`, `web/app/(app)/analytics` |
| 11 | Chrome extension, alumni referral finder, public profile page, Free / Pro limits, College plan with admin dashboard and invite codes | `apps/extension`, `people.ts` (`referralCandidates`), `/p/[slug]`, `shared/plans.ts`, `api/routes/misc.ts` |

## What needs your own setup (honest limits)

- **Real sending** needs a Google Cloud OAuth client (Gmail API) and/or an Azure app registration (Microsoft Graph). Set redirect URIs to `$API_URL/api/oauth/google/callback` and `$API_URL/api/oauth/microsoft/callback`. Gmail apps that send email need Google's OAuth verification before public launch.
- **Gmail reply tracking** needs a Pub/Sub topic with `gmail-api-push@system.gserviceaccount.com` as publisher, plus a push subscription to `$API_URL/api/webhooks/gmail?token=<GOOGLE_PUBSUB_VERIFICATION_TOKEN>`. Outlook uses Graph change notifications (renewed by the worker), so `API_URL` must be publicly reachable over HTTPS.
- **LinkedIn and Wellfound** have no public APIs and forbid scraping, so JobPilot doesn't scrape them. Jobs and people from those sites come in through the Chrome extension (it reads the page you're looking at) or manual entry. LinkedIn messages are generated for you to copy and send yourself. **X** posts use the official API (`X_BEARER_TOKEN`). **YC** uses the community yc-oss "hiring companies" dataset; their actual roles come in through their ATS boards.
- **SMTP mailbox checks** need outbound port 25, which many cloud hosts block. When blocked, addresses show "unknown" with the pattern-based confidence instead of a false "valid".
- **Billing**: `POST /api/billing/plan` switches plans directly outside production. Wire Stripe Checkout + webhooks before charging money.
- **Mock interviews**: the prep pack produces the question list. Plugging in a mock-interview product (e.g. DevPrep) is left as an integration point.
- **WhatsApp** alerts use Twilio's WhatsApp API (sandbox or an approved sender).

## Sending safety defaults

Every email goes from the user's own mailbox, never a shared server. Other defaults:

- Plan caps: Free 15/day, Pro 80/day, College 60/day.
- Per-mailbox caps and a warm-up ramp: 5/day, growing about 20% a day.
- Automatic throttling when inbox health drops.
- Random 1.5–7 minute gaps between sends.
- Weekday sends around 10 AM in the recipient's time zone.
- Verified addresses only; bounced and unsubscribed recipients are suppressed.
- One person per company per campaign.
- `List-Unsubscribe` + one-click (RFC 8058) headers on every email. The link asks for confirmation, so corporate link scanners can't unsubscribe people by accident.
- Approval mode by default.

## Security notes

- Every server-side fetch of a user-supplied URL (portfolio, company site, careers page) is checked against private, loopback and link-local addresses on every redirect hop (SSRF protection).
- Login and signup are rate-limited (20 per 15 minutes per IP + email; in-memory, so use a shared store if you run several API replicas).
- OAuth tokens are encrypted at rest (AES-256-GCM). The API refuses to start in production with the default `JWT_SECRET` / `ENCRYPTION_KEY`.
- Companies and contacts are shared across accounts so research isn't repeated; only the person who added a contact can edit it.

## Useful scripts

| Command | What it does |
|---|---|
| `pnpm dev` | API + worker + web with reload |
| `pnpm build` | Type-check shared, bundle API (`apps/api/dist`), build web, copy extension to `apps/extension/build` |
| `pnpm db:generate` | Generate a new migration after editing `apps/api/src/db/schema.ts` |
| `pnpm db:migrate` / `pnpm db:seed` | Apply migrations / load demo data |
| `node apps/api/dist/server.js` · `node apps/api/dist/worker.js` | Production API and worker |

Load the extension: run `pnpm --filter @jobpilot/extension build`, open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and pick `apps/extension/build`.
