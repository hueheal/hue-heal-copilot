# Copilot V2: the life OS (29 September 2026)

## In one sentence

Copilot V2 is the founder's life OS: it knows the mission and purpose, holds the timelines, roadmap, calendar, pipeline and tender radar across every business, and runs the day through one conversation by voice or chat, acting as PA, coach and operating system at once.

## What changes from V1

V1 grew up as a studio tool with an org chart attached: Create, Clients, Team rooms, briefings, priorities, the OS home. Each was useful; together they meant too many doors. V2 inverts it. The founder's life is the top level, the businesses are lenses on it, and the team of seats is one of the ways work gets done, not the front door.

| V1 | V2 |
|---|---|
| Workspace first (pick a brand, then work) | Life first; "All" is the default lens, each business is a filter |
| Priorities per brand | Mission, purpose and focus above everything; milestones per horizon per business |
| No calendar | Calendar: own events plus the founder's Outlook calendar via a published ICS feed |
| No pipeline | Pipeline: leads, deals, partnerships and tenders in one list by stage |
| No tender search | Tender radar: UK Contracts Finder, keyword-matched, one tap to track |
| Briefing box to the leads | One assistant: talk or type; it answers, acts, or hands work to the team |
| Email via the newsletter composer | The assistant drafts any email; nothing sends until the founder approves |

## The assistant

One voice, three hats, never three screens:

- **PA / EA**: adds and moves tasks, milestones, events and leads; drafts emails and booking requests; checks the calendar before promising time.
- **Coach**: holds the mission and the weekly focus, notices when the week drifts from them, asks one good question rather than lecturing.
- **Operating system**: routes work to the seats (Growth, Product, Partnerships and the rest) through the chief of staff, and brings their approvals back.

Rules it runs by: act on anything reversible and internal; ask before anything that leaves the building (send, book, publish, spend), shown as an approval card; one question at most per reply; British English; never assume the founder's gender; no em dashes.

Voice: speech in through the browser's own recognition (Chrome, Safari, Edge), replies read aloud on request. No extra keys.

## The screens

1. **Today**: the greeting frosts in and settles; then the north star line, this week's focus, the one thing now, today's calendar, what needs approval, the pipeline's next steps due, and new tenders. The composer with a microphone sits at the bottom of every screen.
2. **Plan**: mission and purpose (editable in place), focus areas, then milestones by horizon: this week, this quarter, this year, someday. Each business has its colour.
3. **Pipeline**: every lead, deal, partnership and tender by stage, with value, next step and due date. A Tenders lens shows the radar with Track or Dismiss.
4. **Calendar**: the next fourteen days as a quiet list, with the Outlook feed connected once.
5. **Team**: the existing member layer, unchanged.
6. **Chat**: the full conversation with the assistant, with approvals inline.

## Data

New tables, owner-scoped, `brand_id` optional (empty means life, not a business): `life_profile`, `life_milestones`, `life_tasks`, `life_pipeline`, `life_events`, `life_messages`, `life_actions`. Existing tables are read as they are: brands, priorities, role jobs and approvals.

## Integrations

- **Anthropic** (Claude Opus 5.5, tool use) for the assistant, with server-side fallback on declines.
- **UK Contracts Finder** public API (no key) for the tender radar.
- **Outlook published calendar** (ICS link) for the calendar; read only.
- **Resend** (already configured) for sending approved emails from the founder's own address.

Not yet: two-way calendar writes (needs a Microsoft Graph app registration), real bookings (drafted as requests until a booking provider is chosen), Find a Tender (the above-threshold UK feed) as a second radar source.

## Retiring V1

V2 runs at `/v2` beside V1. When the founder has lived in it for a week and nothing is missing, `/` points at V2 and the V1 routes (Home, Team, the OS draft) are removed; Create, Clients and Settings stay as the studio under V2's menu.

## The Commercial Engine (added 29 September 2026)

The business-development system behind the **Radar** (`/v2/radar`). It replaces the tender radar.

- **Four pipelines, searched twice a day** (06:30 and 13:30 UK summer time) by `radar-engine`, each with live web search and page reading: Studio revenue (tenders, RFPs, briefs, commissions), Founder contracts (freelance, contract, fractional), Venture funding (grants, pilots and partnerships for Remedae and Summer Showdown, only when they fit the product), Outbound (buying signals before any brief exists).
- **Every item is scored** on the Hue & Heal Fit Meter (sector, design scope, ambition, capability, access; 1 to 5) and given one action: pursue now, outreach now, partner, product funding, watch or pass. 1 and 2 are suppressed. New, updated and urgent (under seven days) are flagged; closed and expired items leave the radar with the reason.
- **The daily brief**: at most three priorities, the verdict (best new prospect, best studio contract, best paid contract, best international prospect, product funding worth it) and one insight.
- **The lens** (Radar, Lens tab) is the founder's own description of Hue & Heal that the engine searches and scores against. Pursue, watch and pass decisions, with reasons, are fed back into every scan.
- **Actions**: Pursue files the item in the pipeline with a first next step. Draft outreach asks Copilot for an email in the founder's outreach style; it waits on an editable approval card. Everything also works by voice ("pass on that one, too generic").
- **UK Contracts Finder** refuses cloud servers, so `scripts/tender-radar.mjs` runs on the Mac at 06:00 and 13:00 (launchd, `scripts/com.hueandheal.tender-feed.plist`) and files notices unscored; the engine scores them.
- **Runs** are jobs advanced one model call at a time (the free Supabase plan limits a function to 150 seconds), chained, with an every-minute cron as a safety net. Each run records its cost.
