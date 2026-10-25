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

## Designed posts

Each post is drawn slide by slide in its brand's own design, then emailed as finished slides. The cover is shown large, with the rest as a strip.
- The design families and their sources are in `docs/social-design.md`, which is shared with the brand chats.
- The renderer is in `scripts/post-render/`.
- Moss Island quest slides are the game's own cards.
- Hue & Heal feature and tip slides, and Remedae remedy slides, can each have their own photo, at most four per post.
- The Mac draws the slides in the `render` step. If it has not drawn them within 15 minutes of send time, the email goes with the cover photos instead (5 minutes when the cloud wrote that day's digest).
- "Review and post" opens `/v2/post/:id`. That page shows the slides and the caption, and posts to the brand's Instagram when it is connected.

## The weekly plan

**Friday: planning day.** The digest proposes next week's plan:
- one Instagram post per brand each weekday;
- each brand's Journal and newsletter items.

It weighs the week's news and trends against each brand's strategy, which is in `digest-rules.json` under `strategy`. The plan is saved in `content_plans` as proposed.

**Shaping it.** The founder shapes the plan at `/v2/week`: keep, drop, edit or add items, write notes, rework it with Opus (about 10p), and approve. Approving turns the Journal and newsletter items into dated tasks.

**Monday: action mode.** A plan still waiting on Monday morning runs as proposed. Each day's posts follow that day's items. Monday's email shows the week.

## How a day runs

One row in `founder_digests` per day; the row is the job (`stage`).

| London time | What happens |
|---|---|
| 06:30 | The `founder-digest-tick` cron (every 5 min, 04:00 to 11:55 UTC) opens the day with its context, stage `mac`. |
| about 07:00 | The scheduled Claude task `hue-heal-founder-digest` runs on the Mac on the Claude plan, so it costs nothing extra. It researches and writes the digest, then files it. It uses `node scripts/digest-local.mjs context`, then `file <json>`. |
| on filing | Copilot saves the posts and tasks, moves the lesson on, and makes the photos. Stages: `filed`, then `images`, then `render`, then `send`. The Mac draws the slides in `render`. |
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
