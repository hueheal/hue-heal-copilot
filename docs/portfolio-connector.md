# The portfolio connector

Copilot V2 → **Portfolio** (`/v2/portfolio`). Everything Hue & Heal runs, in one place: the studio (its site and the copilot itself), the ventures (Remedae, Moss Island) and the clients (from the studio's client list). Built 23 October 2026.

## How it works

- Each venture is a workspace (`brand_profiles`); each client is a row in `clients`. Moss Island was added as a workspace (accent `#559EA4`, site mossislandgame.com).
- `connections` (migration 0041) lists what to watch for each: website, hosting, code, email, data. A row holds public identifiers only (a URL, a Netlify site id, a Vercel project and team id, a GitHub repo and branch, a domain). Any key it needs is a Supabase secret named in `secret_name`, never stored in the table.
- The `portfolio` function checks every connection at 06:10 and 13:10 UTC (cron `portfolio-check`) and when you tap Check. Every result is kept in `connection_checks` for 90 days, so changes over time (a failed deploy, new sign ups) can be reported.
- The assistant sees the latest status (PORTFOLIO in its state) and can run a check (`portfolio_check`), so "is everything up?" works by voice.
- On Netlify sites the card offers **Rebuild**.

| Provider | What it reports | Key |
|---|---|---|
| web | Up or down, response time | none |
| netlify | Latest deploy: ready, building or failed, when, from which branch | `NETLIFY_TOKEN` |
| vercel | Latest production deploy and its commit | `VERCEL_TOKEN` |
| github | Last change and its message, open pull requests | `GITHUB_TOKEN` (fine-grained, read-only) |
| resend | Domain verified, or the sending key is set | the business's Resend key |
| supabase | A product's own numbers (sign ups, active families), with change since yesterday | a metrics key, via a read-only `copilot_metrics(p_key)` function in that product's database |

Keys are set by the founder on the Mac, typed hidden: `bash scripts/connect-provider.sh netlify | vercel | github`.

## Data and what is still open

- **Product data** (24 October 2026). Moss Island: live (families, families playing and quests this week, founding applications, new feedback). Remedae: the function is in `remedae/supabase/migrations/20261024000000_copilot_metrics.sql`; it goes live once the founder runs it in Remedae's Supabase SQL editor (Remedae's database is in a separate Supabase account). Each product's database holds only the SHA-256 fingerprint of the key in `copilot_access`, which no client role can read; the keys are the copilot secrets `MOSS_METRICS_KEY` and `REMEDAE_METRICS_KEY`. A connection's `config.show` sets which counts appear and their words (`"singular|plural"`).
- **Clients.** The two clients (Opti-u, Helius Network) have no sites to watch yet; use Connect on their card when they do.
