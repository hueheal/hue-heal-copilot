# The Founder's Digest

A branded email from Hue & Heal to the founder every morning at 07:30 London time. It replaces the daily Instagram post emails (the `daily-posts` function and its cron were removed on 25 Oct 2026).

## What is in it

1. **The pulse**: live numbers for each company. Remedae and Moss Island come from their own databases through the portfolio connector. Hue & Heal shows subscribers, strong radar leads and the pipeline.
2. **Today's three**: the three moves that matter most across the companies, each with a date.
3. **In the industry**: four to six real stories from the last seven days, each with what it means for her.
4. **Ready to post**: one post each for Hue & Heal, Remedae and Moss Island.
   - Each is a single image or a carousel. Reels only when allowed on the Digest page.
   - Each comes with a cover image from Higgsfield and is saved as a draft in the studio.
   - "Review and post" opens the draft in its own brand world.
5. **Founder coaching**: one lesson a day from a 30-lesson curriculum (`supabase/functions/_shared/digest-rules.json`). Each lesson has a principle, a real case, how it applies to her and a 15-minute drill.
6. **Next steps**: one to three dated steps per company.
   - These are saved as tasks in `life_tasks` with `source = 'digest'`.
   - Unfinished steps are carried forward rather than repeated, and overdue ones are listed.
7. **One question to sit with.**

## How a day runs

One row in `founder_digests` per day; the row is the job (`stage`).

| London time | What happens |
|---|---|
| 06:30 | The `founder-digest-tick` cron (every 5 min, 04:00 to 11:55 UTC) opens the day with its context, stage `mac`. |
| about 07:00 | The scheduled Claude task `hue-heal-founder-digest` runs on the Mac on the Claude plan, so it costs nothing extra. It researches and writes the digest, then files it. It uses `node scripts/digest-local.mjs context`, then `file <json>`. |
| on filing | Copilot saves the posts and tasks, moves the lesson on, and makes the three cover images. Stages: `filed`, then `images`, then `send`. |
| 07:30 | The digest is sent through Resend from news@hueandheal.com to the address on the Digest page, or the Copilot sign-in email when none is set. |

If the Mac has not filed by 07:30, the cloud writes the digest itself and sends it a few minutes later. It researches with Sonnet 5.5 and web search, then writes with Opus 5.5. That costs about 50p.

## Where to change it

- **Copilot, `/v2/digest`**: preview, past digests, send again, write a fresh one, send time, recipient, Mac on or off, reels, pause, interests and the coaching track.
- **Copilot chat**: for example "add biophilic design to my digest". This uses the `digest_settings` tool in `life-agent`.
- **The editorial rules, brand post rules and curriculum**: `supabase/functions/_shared/digest-rules.json`. Both the Mac and the cloud read this file.
- **The email design**: `supabase/functions/_shared/digest-email.ts`. It follows the website's Letter (`netlify/lib/letter.mjs` in the site repo) and uses its wordmark from `HH_SITE_URL/email/`.

## By hand

- To write today's now from SQL: `select public.founder_digest_call(jsonb_build_object('op','run','owner','<uid>'))`.
- To nudge the queue: `select public.founder_digest_call()`.
