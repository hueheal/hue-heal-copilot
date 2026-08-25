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
| 7 Creator canvases | chrome pass done | EditorShell header in ck idiom; canvases untouched by design; full per-editor migration is future work |
| 8 Projects/Library/versions | done | 0024 migration (applied), lib/assets.ts, pages/Library.tsx, chrome/VersionHistory + snapshots on save |
| 9 Brand + Knowledge | done | Settings → Knowledge tab, brand_profiles.knowledge, injected into all writers incl. daily-posts |
| 10 Polish | done for new surfaces | skeletons, empty states, focus-visible, reduced-motion, tooltips |

Deliberately deferred (future passes):
- Full Tailwind/shadcn literal adoption (chrome is radix+cmdk+tokens, shadcn architecture)
- Per-editor canvas-first rework (floating composer inside editors)
- Project detail page (projects work via Library filters + assignment)
- LLM intent parsing in the composer (local keyword detection today)
- Mobile shell restyle (MobileNav still hh-styled)
