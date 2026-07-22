# Hue & Heal — Studio Co-pilot

The Hue & Heal studio's operations + social content workspace. First end-to-end
pass, implemented from the **Copilot Dashboard** design in the Hue & Heal Claude
Design project (`10931f7d-8fa7-426b-a776-ba5ef43ed15e`).

## Run

```bash
npm install
npm run dev      # http://localhost:5273
```

## Stack

- **Vite + React 18 + TypeScript**, `react-router-dom` for the five workspace sections.
- Design tokens ported verbatim from the Hue & Heal design system into
  `src/styles/tokens.css` (warm material neutrals + single copper accent, three
  type voices, warm shadows).

## What's built

| Route | Surface | Status |
|-------|---------|--------|
| `/` | **Dashboard** | Full fidelity to `Copilot Dashboard.dc.html` — live date/greeting, metric row, Social Copilot hero, Proposals card, "Needs attention" feed |
| `/clients` | **Clients** | Pipeline board (Leads → Proposal out → Active → Delivered) |
| `/proposals` | **Proposals & Invoices** | Priced proposals + invoice ledger with status tones |
| `/social` | **Social Copilot** | Interactive, Canva-like content creator — brief a topic, pick format / sector / adaptive accent, live branded artifact + caption + hashtags |
| `/reports` | **Reports** | Studio KPI band (10 / 261 / 15) + reach-by-channel |

## Backend (Social Copilot)

Hosted **Supabase** (Postgres + auth + storage) + **Claude** for copy + a
pluggable image model for assets. The app **gracefully degrades to local mode**
(in-memory data, on-device template generation) until keys are set, so
`npm run dev` always works. See **[SETUP.md](SETUP.md)** to switch it on.

- `supabase/migrations/0001_social_copilot.sql` — schema, RLS, storage bucket, brand-kit seed
- `supabase/functions/generate-copy` — Claude (Anthropic Messages API, structured output)
- `supabase/functions/generate-image` — image generation (default OpenAI `gpt-image-1`)
- `src/lib/supabase.ts` · `src/lib/auth.tsx` · `src/lib/socialCopilot.ts` — client, auth, data layer

## First-pass substitutions (to revisit)

- **Romie** (the editorial display serif) is a *trial* font, not production-licensed.
  Substituted with **Fraunces** (Google Fonts, high-contrast, true light weights).
  Swap in a licensed Romie — or keep Fraunces — before shipping.
- The `atmos-*.png` atmospheric photographs are recreated as a CSS gradient
  (`.hh-atmos` in `global.css`). Drop in the real cleared imagery for production.
- All data in `src/data/studio.ts` and page files is mock data, shaped to map
  onto a real operations API later.
