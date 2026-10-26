# Social posts: Figma is the source

Since 26 Oct 2026, each brand's bespoke Figma social templates are the only source of truth for social design.
- Copilot no longer has a social post interface, and no longer draws posts itself.
- Posts are made in Figma, in the background, when asked by voice or chat.
- The Founder's Digest writes each day's post copy for these templates.
- Making the posts in Figma each morning is the next step, below.

| Brand | Figma templates | Status |
|---|---|---|
| Moss Island | File `zRPzlRUISFVMvw7KZXkjws` (https://www.figma.com/design/zRPzlRUISFVMvw7KZXkjws). Page 1 holds the launch carousels, the Founding Families set and the art library. Page "Calendar Events" (22:139) holds the calendar covers, such as "Introducing Diwali Quests", and the calendar cards. Made in the MOSS ISLAND chat. | In use |
| Hue & Heal | Link to come from Maria. | Waiting |
| Remedae | Remedae is building its own bespoke Figma templates; link to come from Maria. Until then, its copy follows `docs/remedae-social-system.md`. | Waiting |

**Rules that stay with the copy, whatever the template:**
- **Moss Island:** real quests only, from the game. Use `scripts/moss-quests.mjs`, which exports them to `supabase/functions/_shared/moss-quests.json`; re-export and redeploy founder-digest when quests change. No children's faces. Always "children do quests in real life, … a grown-up approves each quest once it is complete". Never "small quests" or "a grown-up says yes".
- **Remedae:** end on a save or visit hook. Traditions are told as the written record. No doses and no medical claims. Always "interaction notes".
- **Hue & Heal:** always "Hue & Heal". No em or en dashes anywhere.

**When a template changes:** the brand's chat updates its Figma file and adds a line here saying what changed. The Copilot chat then keeps the digest's post copy in step.

**Next step: made in Figma each morning.** After the digest is filed, the Mac's scheduled task will:
1. Copy the right template frame in each brand's Figma file.
2. Fill in the day's copy.
3. Export the slides for the email.
4. Link the email to the frame in Figma.

This starts once the Hue & Heal and Remedae links are in.
