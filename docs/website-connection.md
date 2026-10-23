# Copilot and hueandheal.com: how they connect

Last checked: 23 October 2026. The site is `hueheal/HueandHeal-Website` (Astro, static, on Netlify as `hueandheal`, currently served from branch `claude/hue-heal-redesign-bhgogt` at hueandheal.netlify.app). Its own notes for the copilot are `docs/COPILOT-BRIEF.md` and `docs/DEPLOY.md` in that repo, and `docs/COPILOT-CONNECTION.md` there mirrors this file. This file is the copilot side, and the single list of what is wired, what is waiting, and what each side must keep stable.

## What is wired

| Flow | How | Where |
|---|---|---|
| Newsletter, report, Creative Boost and shop sign ups | The site posts to the copilot's `subscribe` function with the Hue & Heal brand id and a group (`newsletter`, `reports`, `creative-boost`, `shop-*`). Rows land in `subscribers` with an `unsub_token`. | `supabase/functions/subscribe`, migration 0010 (applied 19 Oct 2026; sign ups failed before that) |
| Unsubscribe | Every email links to `copilotadmin.hueandheal.com/unsubscribe?t=<token>`. | `src/pages/Unsubscribe.tsx`, `supabase/functions/unsubscribe` |
| Journal pieces onto the site | Studio → Journal → **Publish to hueandheal.com** saves the piece, marks it `published` (slug kept for life) and calls the site's Netlify build hook. The site's build reads published Hue & Heal rows with the public anon key and serves `/journal/<slug>` about a minute later. Unpublish reverses it. | `hh-site` op `publish` / `unpublish`; migration 0040 (anon can read `status = 'published'` only); Netlify env `PUBLIC_SUPABASE_ANON_KEY`; Netlify build hook "Copilot publish" |
| The Letter (monthly) | Studio → Newsletter (Hue & Heal) opens **The Letter**. The copilot holds the issue's words; the site renders the email (`/api/letter-render`, design in the site's `netlify/lib/letter.mjs`). The preview is the real email. Sent one per subscriber in the `newsletter` group, each with their own unsubscribe link (the renderer's Resend placeholder is swapped for it). Sent issues are recorded in `newsletters` (template `site-letter`). | `src/pages/LetterEditor.tsx`, `hh-site` ops `render` / `email` |
| New essay email | On a published piece: **Send me a test**, then **Email the newsletter list**. Same renderer, `type: "essay"`. | `CreateEditor.tsx` (Hue & Heal journal), `hh-site` op `email` |
| Project enquiries | The site's `project` form (Netlify Forms) emails hello@hueandheal.com and, through a signed outgoing webhook, becomes a lead in the copilot's pipeline ("Website enquiry: …", next step: reply). | Netlify form detection (was off until 23 Oct), email notification and webhook on `submission_created`; `hh-site` (verifies Netlify's JWS signature) |
| House style | The journal writer follows the site's rules for Hue & Heal pieces: title ends with a full stop, dek under 40 words, takeaways start with a verb, headings every 250 to 400 words, "we" and "Hue & Heal". | `supabase/functions/generate-journal` |

Secrets (Supabase, never in the repo): `NETLIFY_BUILD_HOOK_HH`, `LETTER_RENDER_SECRET` (same value as the site's Netlify env), `NETLIFY_FORMS_SECRET` (same as the webhook's signature secret), `HH_SITE_URL` (`https://hueandheal.netlify.app` until the domain moves), `RESEND_API_KEY`.

## What each side must keep stable

- **Site:** `/api/letter-render` accepts `{ type: "letter" | "essay", data }` with `authorization: Bearer <LETTER_RENDER_SECRET>` and returns `{ subject, html, text }`, with `{{{RESEND_UNSUBSCRIBE_URL}}}` where the unsubscribe link goes. The journal loader reads `journal_articles` (`status = published`, Hue & Heal brand) and the fields `title, dek, reading_time, body_md, blocks, takeaways, slug, published_at, hero_image, kind`. The `project` form keeps its name and its `email`, `name`, `company` and message fields.
- **Copilot:** the Hue & Heal brand id (`33cf218b-7b06-4388-8452-f40090d55bdf`), the `subscribe` function's body (`brandId, email, name, group`), slugs never change once published, block types limited to heading, text, quote, list, image, divider and button.

## Still to do

1. **The live branch.** Merge `claude/hue-heal-redesign-bhgogt` into `main` in the site repo and set `main` as Netlify's production branch, then re-point the "Copilot publish" build hook at `main`.
2. **The domain.** DNS for hueandheal.com is at **Cloudflare** (not Wix, as the site's DEPLOY.md says); the apex and www still point at Wix. In Cloudflare: `www` CNAME to `hueandheal.netlify.app`, the apex to Netlify's load balancer. Leave MX (Outlook), SPF, DMARC, `resend._domainkey` and the `send` records exactly as they are. Then add the domain in Netlify, disconnect Wix, change `HH_SITE_URL` to `https://www.hueandheal.com` and `HH_SITE` in `src/lib/hhSite.ts`, and submit `/sitemap-index.xml` to Search Console.
3. **Hero images.** Journal pieces need a 16:9 hero in the site's image direction before publishing ("Gaming is becoming healthy" and "wellness around the world" have none).
4. **Creative Boost emails.** The site's `send-page` function needs `RESEND_API_KEY` and `RESEND_FROM` in Netlify (a sending key for hueandheal.com).
5. **Admin sign-in on the site.** `ADMIN_PASSWORD` in Netlify's Production field must be at least 16 characters (flagged by the website chat).

## Notes for the website chat

- `docs/COPILOT-BRIEF.md` says the copilot's subscribe function adds people to a Resend audience. It does not: subscribers live in the copilot, and the copilot sends one email per person. A Resend Broadcast would reach nobody.
- `docs/DEPLOY.md` says DNS is at Wix. It is at Cloudflare.
- Netlify form detection was switched off (`ignore_html_forms`), so `project` and `letter-open` submissions were being dropped. It is on now, with an email notification to hello@ and the copilot webhook.
- `PUBLIC_SUPABASE_ANON_KEY` is now set in Netlify, so the build pulls published copilot pieces; before, it logged "No Supabase key set" and skipped them.
- `LETTER_RENDER_SECRET` was replaced with a new value on 23 Oct (all contexts, functions scope); the copilot holds the same one.
- The renderer ignores `data.unsubscribeUrl` and always writes the Resend placeholder; the copilot substitutes it, so no change is needed unless you want the renderer to honour the field.
