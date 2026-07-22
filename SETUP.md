# Social Copilot backend — setup

The app runs **without any of this** (local mode: in-memory drafts, on-device
template generation). Do the steps below to switch it into **connected mode**:
persistence in Postgres, Claude-generated copy, and AI image generation.

These are the parts only you can do — they involve creating accounts and holding
secret keys, which I can't do for you.

---

## 1. Create a Supabase project

1. Go to https://supabase.com → **New project**. Pick a name (e.g. `hue-heal-copilot`) and a region close to you.
2. Once it's ready, open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Point the frontend at it

```bash
cd hue-heal-copilot
cp .env.example .env.local
```

Fill in `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

Restart `npm run dev`. The Social Copilot status strip should turn green ("Connected").

## 3. Create the database

In the Supabase dashboard → **SQL Editor** → paste the contents of
[`supabase/migrations/0001_social_copilot.sql`](supabase/migrations/0001_social_copilot.sql)
and **Run**. This creates the tables, row-level security, the `social-assets`
storage bucket, and seeds a **Hue & Heal brand kit** for every new user.

_(Alternatively, with the Supabase CLI: `npx supabase link --project-ref YOUR_REF`
then `npx supabase db push`.)_

## 4. Sign in

Auth uses email magic links. On the Social Copilot page, enter your email and
click **Send magic link**, then click the link in your inbox. (Supabase → **Auth
→ Providers** has email enabled by default.) Signing in seeds your Hue & Heal
brand kit automatically.

## 5. Add the AI secrets + deploy the edge functions

The functions hold the secret keys so they never reach the browser.

```bash
# One-time login + link
npx supabase login
npx supabase link --project-ref YOUR_REF

# Secrets (server-side only)
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...       # copy generation (Claude)
npx supabase secrets set OPENAI_API_KEY=sk-...              # image generation (default provider)
# optional overrides:
# npx supabase secrets set ANTHROPIC_MODEL=claude-sonnet-5
# npx supabase secrets set OPENAI_IMAGE_MODEL=gpt-image-1

# Deploy
npx supabase functions deploy generate-copy
npx supabase functions deploy generate-image
```

- **`ANTHROPIC_API_KEY`** — from https://console.anthropic.com. Powers on-brand
  captions, hashtags and carousel slides. Without it, generation falls back to
  the on-device template.
- **`OPENAI_API_KEY`** — from https://platform.openai.com. Powers the **Image**
  button (photographic backgrounds). Swap providers by editing
  `supabase/functions/generate-image/index.ts` and setting `IMAGE_PROVIDER`.

---

## What works in each mode

| Capability | Local mode | Connected mode |
|---|---|---|
| Brief → live branded preview | ✅ | ✅ |
| Generate caption / hashtags / slides | ✅ template | ✅ Claude |
| Save & schedule drafts | ✅ in memory | ✅ Postgres (per-user, RLS) |
| Content library | ✅ (resets on reload) | ✅ persistent |
| AI background image | ❌ | ✅ (stored in `social-assets`) |

## Notes

- **Model choice:** copy defaults to `claude-sonnet-5` (fast, on-brand). Bump to
  `claude-opus-4-8` via the `ANTHROPIC_MODEL` secret for the richest output.
- The schema is in one migration for easy review; regenerate typed bindings with
  `npx supabase gen types typescript --linked > src/lib/database.types.ts` after
  schema changes.
