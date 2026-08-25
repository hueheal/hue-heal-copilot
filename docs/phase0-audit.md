# Phase 0 Audit — Master Redesign

Prepared 25 Aug 2026 against c53d551. Full formatted version (for review):
the "Copilot Phase 0 Audit" artifact. Brief: docs/master-redesign-prompt.md.

## 0.1 Architecture
Vite 5 + React 18 + TS 5.6, react-router 6, ~8.6k lines. No Tailwind/shadcn;
inline styles + CSS variables in src/styles/global.css (light theme only).
Netlify from GitHub main. Supabase dxniwcwoacyrjlyhymoh: Postgres+RLS, Auth,
Storage (social-assets), 18 edge functions, pg_cron. Anthropic claude-sonnet-5
from functions only. Resend, remedae.app publish contract, Instagram Graph
(both token routes). PDFs via @react-pdf/renderer; print for client docs;
html2canvas+jszip for social. VITE_FORCE_LOCAL local mode.

## 0.2 Features (all live)
Brand worlds (identity, memberships, synthesis via synthesize-brand +
generate-social-style). Social studio: staged pipeline topic→template→edit,
23-template Remedae family + house set, per-slide carousel layouts, hook-aware
copy, AI images, export, direct Instagram publish. Journal: types/lengths,
hero+inline images, remedae.app publish/update/unpublish, →newsletter,
→Instagram. Newsletter block editor + Resend. Daily posts cron (no-repeat).
Clients pipeline + rooms + docs + share links; proposals/invoices PDF;
calendar, reports, subscribers, team, /templates gallery. Guardrails:
Hue & Heal name enforcement, no-dash style, server-side on all writers.

## 0.3 Routes
/ dashboard · /create hub · /create/social/:id · /create/:family ·
/create/newsletter · /clients(/id)(/doc/:docId) · /proposals(/:id) ·
/invoices/:id · /calendar /reports /settings /templates · /subscribe
/unsubscribe. Shell: StudioLayout + Sidebar + brand context scoping.

## 0.4 Data model
14 tables: app_members, brand_profiles, brand_members, brand_kits(legacy);
journal_articles, newsletters, social_posts, content_ideas, post_assets;
clients, client_docs(share_token), proposals, invoices, subscribers.
Content is per-type JSONB blocks/design. MISSING: unified asset index,
projects, versions. Files keyed by uploader UID in social-assets.

## 0.5 AI
Prompts server-side; brand voice/guidelines injected everywhere;
generate-journal uses json_schema output; generate-copy is template-hook
aware. Gaps: no token/cost tracking, no stage streaming, minimal rate limits.

## 0.6 Components
16 shared components (EditorShell, Sidebar/StudioLayout, SlideView,
WorkspaceSelect…). Tokens flat (colors+fonts); no spacing/radius scales,
no dark theme; accessibility partial.

## 0.7 Must not break
remedae publish (slugs!), Instagram OAuth (redirect URI is /settings,
registered verbatim), client share links, daily-posts cron URL, saved JSONB
designs (migrate readers, never rewrite data), PDF/print/PNG exports +
file naming, local mode.

## 0.8 Retain
All 18 functions + prompts + guardrails; schema + RLS; storage; auth;
lib/social engine; journal/newsletter block models; derivative pipelines;
pdfDoc; brand context; deployment.

## 0.9 Refactor
Shell (replace), Dashboard→Home (replace), Create hub (rework), EditorShell
chrome (evolve to canvas-first), Settings→Brand+Knowledge (split), lists→
Library (rework), tokens (extend + dark).

## Chrome vs canvas (confirmed direction)
The refactor is the TOOL'S INTERFACE ONLY. Two systems, hard boundary:
chrome (shell, sidebar, cmdK, Home, Create, Library, Settings, editor rails,
dialogs) = new shadcn/Apple theme, Geist/Inter, neutral palette, light+dark.
Canvas/output (slide canvases + social exports, journal previews + remedae
publishing, newsletters, proposal/invoice PDFs, client docs + share pages,
template previews) = each brand world's identity, untouched. --hh-* tokens
and brand engines become output tokens owned by the canvas layer. Workspace
accent may tint small chrome touches; chrome never inherits brand fonts;
canvases never inherit chrome styling.

## 0.10 Sequence & recommendations
shadcn: owns the chrome, and only the chrome. Tailwind+shadcn for new shell/surfaces themed by the brief's
tokens; existing editors keep inline styles, migrate screen-by-screen in
Phase 7. Tokens file is the bridge.
Order: 1 tokens+dark · 2 shell+cmdK · 3 Home · 4 Create composer ·
5 Projects+Library (pulled ahead; new tables: projects, project_assets,
asset_versions, thumbnails) · 6 creator canvases one at a time ·
7 Brand+Knowledge (brand_profiles extensions + knowledge table) · 8 polish.
Rollout: Option C phased-on-main (single primary user; git revert as
rollback), not the brief's Option B beta toggle.

## Gaps vs vision
Home missing · Workspaces strong · Create partial (no universal composer/
intent detection) · Library missing · Intelligence partial (no Knowledge
layer) · Projects/versions/references missing · Cmd+K missing ·
Derivatives strong.

## Known unknowns
Meta developer-account block (Instagram posting gated); remedae DELETE route
pending; font decision (Geist for UI chrome vs Prata/Poppins identity; Ivy
Ora not embeddable); Library thumbnail capture for documents; no cost
tracking; version-history retention policy; mobile scope confirmation.

## Decisions
RESOLVED: 1) shadcn = tool chrome only, canvases untouched  3) chrome type =
Geist/Inter, brand faces live on in outputs.
STILL NEEDED before Phase 2: 2) rollout C over B  4) Library/Projects pulled
ahead of creator rework.
