# Master redesign — implementation status (25 Aug 2026)

Chrome/canvas rule enforced throughout: --ck-* tokens style the tool,
--hh-* and brand engines style every output. See docs/phase0-audit.md.

| Phase | Status | Where |
|---|---|---|
| 0 Audit | done | docs/phase0-audit.md + artifact |
| 2 Tokens + themes | done | src/styles/chrome.css (light/dark/system, Geist) |
| 3 Shell | done | chrome/AppSidebar (collapsible rail, workspace switcher), chrome/CommandBar (⌘K) |
| 4 Workspace identity | done | accent-aware chrome, switcher, per-world scoping (pre-existing) |
| 5 Home | done | src/pages/Home.tsx (composer, continue-working, suggestions) |
| 6 Create | done | src/pages/Create.tsx + chrome/Composer (intent detection, tiles, ideas) |
| 7 Creator canvases | done | Full chrome migration: EditorShell (header/rail/sheet), all editor rails, Clients pipeline + client room, Settings, Proposals, Calendar, Reports, PageHeader, MobileNav — all ck, light+dark. Canvases/previews (slides, article/doc/email/proposal/invoice renders) untouched |
| 8 Projects/Library/versions | done | 0024 migration (applied), lib/assets.ts, pages/Library.tsx, chrome/VersionHistory + snapshots on save |
| 9 Brand + Knowledge | done | Settings → Knowledge tab, brand_profiles.knowledge, injected into all writers incl. daily-posts |
| 10 Polish | done for new surfaces | skeletons, empty states, focus-visible, reduced-motion, tooltips |

Deliberately deferred (future passes):
- Full Tailwind/shadcn literal adoption (chrome is radix+cmdk+tokens, shadcn architecture)
- Canvas-first interaction rework (floating composer inside editors)
- Project detail page (projects work via Library filters + assignment)
- LLM intent parsing in the composer (local keyword detection today)

## Roles (added 25 Aug 2026)
Persona agents per workspace, each running a division:
- `roles` / `role_runs` / `role_items` tables (0025, 0026 — applied).
- Presets: CMO, Editor-in-chief, Social strategist, Brand guardian; custom seats.
- Each role: charter + standing instructions, layered over brand voice +
  Knowledge, grounded in a live workspace snapshot (cadence, recent pieces,
  pipeline, subscribers). Never invents metrics; missing data becomes a "need".
- Dashboard per role (/roles/:id): KPI strip, composer + playbook plays,
  structured deliverables whose proposed pieces spawn drafts one-click,
  ledger of tool requests + experiment proposals with approve/decline,
  desk history, cadence control (on demand / daily / weekdays / weekly).
- role-agent (on demand) + role-scheduler (chained off the 7am daily-posts
  cron via CRON_SECRET; standing task on cadence days, weekly digest Fridays).
