# Women's health launch batch · 16 September 2026

Editorial and growth seats, Hue & Heal copilot, for the Remedae women's health launch. Everything in this folder is a draft for approval. **Ready for the founder's send. Nothing has been sent or posted.**

Location note: neither the social system doc nor the copilot repo defines a batch location, so this batch sits at `batches/2026-09-16-womens-health/` exactly as briefed. If a convention lands later, move the folder, not the contract.

## What's in the batch

| Asset | What it is | Where it goes |
|---|---|---|
| `newsletter.html` | Complete editorial (Family B, light) email announcing the shelf and pointing to the journal piece. Subject and preheader in the HTML comment at the top. Two CTAs (shelf, article), the family maximum. Unsubscribe placeholder `{{unsubscribe_token}}` in the footer, on the marketing templates' `/api/auth/unsubscribe?token=` pattern; the send pipeline substitutes the per-recipient HMAC token. | `POST /api/studio/email` via the Studio, or `sendMail` with `editorialShell`. Editorial sends go only to `journal_subscribers` not on `email_unsubscribes`, max one editorial email per address per week. |
| `social/post-1.md` | Editorial cover carousel promoting the journal piece (earns reads). Rendered PNG slides in `social/carousel/`. | Social Studio → Article → Instagram flow, then the founder's approval pile. |
| `social/post-2.md` | The number: the 65.9% BMJ Open stat (earns comments). | Social Studio → Create → Social → portrait, then the approval pile. |
| `social/post-3.md` | The reframe: unproven is not disproven (earns swipes and shares). | Social Studio → Create → Social → portrait, then the approval pile. |
| `journal.md` | The reframed journal anchor: URL, dek, standfirst, the remedy cards it carries, and the only stats cleared for reuse. The rewrite sits as a draft in the Remedae repo pending the founder's approval. | Reference only; the founder approves the article before it ships. |

Images: all from the live set at `https://remedae.app/assets/womens-health-*.jpg`; social posts reference the same files by repo path under `/Users/maria/Claude/remedae/public/assets/` for the studio to compose.

## Suggested order and timing

The three posts run as a series so the grid tells one story: announce, evidence, reframe.

1. **Wed 17 Sept, 08:30 local** · `newsletter.html` to the journal subscriber list. Subscribers hear first.
2. **Wed 17 Sept, 12:00** · Post 1 (Editorial cover carousel). The announcement, same day as the email so the story lands as one moment.
3. **Fri 19 Sept, 12:00** · Post 2 (The number). The stat gives the announcement a second wave and invites comments into the weekend.
4. **Mon 22 Sept, 17:30** · Post 3 (The reframe). Closes the series on the piece's core argument, when saves and shares run highest.

Hashtags: none anywhere. The social system doc does not provide for them, so the batch omits them rather than assume permission.

## Claims discipline

Facts stated across the batch: 23 women's health conditions live; every tradition read side by side with modern medicine; safety notes on every card; the shelf at remedae.app/womens-health; the journal piece at remedae.app/journal/start-in-the-kitchen. The only numbers used are the three sourced stats from the journal piece itself (listed in `journal.md`). No testimonials, no health claims, no invented figures, no em or en dashes.

**Ready for the founder's send. Nothing has been sent or posted.**


## Reframe note · 16 September 2026

The founder struck the "nobody has properly studied" framing across the whole batch: it was untrue. The batch now leads with women understanding their bodies through traditions that have existed for centuries. Every asset in this folder reflects that; the journal rewrite awaits the founder's approval before going live.

## Kitchen rework · 16 September 2026, evening

Founder direction: less explaining what Remedae is, more writing people remember; show only kitchen or well-known ingredients in this batch and leave the rest for people to discover on the app; every social post ends on a hook (save, visit, or a named action).

- Carousel rebuilt from the founder's Figma (7 slides, `social/carousel/`), ending on "Save this for your next shop."
- Remedies used across the batch: fresh ginger tea, fennel seed decoction, ajwain seed water, honeybush tea. All facts taken from their live cards.
- Posts 2 and 3 end on their own hook lines ("Save it for someone expecting", "Find the rest on remedae.app").
- Newsletter, telegram and journal draft rewritten on the kitchen line: "A lot of women's medicine never lived in a pharmacy. It lived in the kitchen."

Still a draft. Nothing has been sent or posted, and the journal rewrite is not live.
