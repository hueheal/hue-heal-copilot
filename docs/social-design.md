# Social post design: one source for Copilot and the brand chats

Copilot draws every Founder's Digest post in its brand's own design.
- The code is in `scripts/post-render/`. `brands.mjs` holds the three families.
- `moss-cards.mjs` captures the Moss Island game's own quest cards.
- `render.mjs` draws the slides on the Mac each morning.

This page records where each style comes from, so Copilot and each brand's own Claude chat stay in step.

**When a brand's style changes:**
1. Update that brand's section here: what changed, and the source (Figma node, file or chat).
2. Tell Maria.
3. The Copilot chat updates `brands.mjs` to match and redraws the concepts.

Concepts to approve are published at https://claude.ai/artifact/GKRswG8eoG4VgDUACVA3Y2.

## Hue & Heal

**Source**
- The Hue & Heal Brand Figma, file `qDrGcT3SPOrIuEiVaiBw0E`, frame `170:1124` (25 Oct 2026).
- The website kit (site repo `docs/social/launch/`) is the website's own launch set, not the everyday style.

**Look**
- **Photography:** warm, cinematic, full-bleed photos fading to near black. Amber lamplight, candlelight, dusk.
- **Type:** Ivy Ora light from the studio's Adobe Fonts kit, with one *italic phrase*. Poppins for the small lines.
- **Eyebrow:** a tiny tracked eyebrow at the top, such as EXPERIENCE DESIGN, CREATIVE COACHING or hue&heal's GUIDE TO.
- **Centred stack:** a small line, the big title, a small line under it, and a glass pill.
- **Footer:** "Swipe to see how ⟶" in Ivy Ora italic.
- **No-photo slides:** pause and closing slides sit on black, with a glowing halo or ring in the room colours.

**Kinds**
- `cover`: the series cover.
- `feature`: one named example, with its own photo and labelled lines such as "Experience:" and "Why it works:".
- `tip`: one idea in a series, with its own photo.
- `pause`: a word in a ring.
- `statement`: a line set large.
- `close`: a question or call on the warm glow, with the wordmark.

## Remedae

**Source**
- The Remedae Instagram system in Copilot (`docs/remedae-social-system.md`, `src/lib/social/remedae.ts`).
- It was built from Remedae's Figma Social Media page (file `Z3EfpRcsUWV40K0cpR60ZS`, node `154-8220`) and the "Instagram Hook Templates" design, with the founder's rules of 16 Sept 2026.

**Look**
- **Ground:** forest, with cream only for save posts. Yellow is reserved for Remedae+.
- **Type:** Quando headlines with exactly one mint *phrase*. Poppins for everything else.
- **Cue:** one cue per post, ending in ›.
- **Mark:** the Remedae mark, bottom left, and no other corner chrome.
- **Photos:** bright, single-subject, natural light.

**Kinds**
- `cover`: the editorial cover, with two pills.
- `question`, `number` and `myth`: the hook shapes.
- `remedy`: the founder's numbered remedy slide. Tradition and region top left, the number top right, a "for ..." line, the name, the use and one fact, and a care note. It may have its own photo.
- `glance`: the cream save card.
- `hook`: the closing slide, with a quick-glance list and the cue.
- `statement`.

**Rules**
- No doses and no medical claims.
- Always "interaction notes", never "interaction checking".
- Traditions are told as the written record.

## Moss Island

**Source**
- The Moss Island chat's social set. Its renderer was in that chat's scratchpad, `social/render.mjs` (23 Oct 2026).
- `docs/strategy/social-marketing.md` (Grid look) and `DESIGN.md` in the Moss Island repo.
- The game's own `QuestCard` (`src/child/cards.tsx`).

**Look**
- **Sky:** the teal sky (`#559EA4` radial), with clay islands and Moss on the sky.
- **Type:** Newsreader light titles in white. Poppins in the cards and rows.
- **Rows:** glass rows with glow-coloured numbers.
- **Cards:** quest cards are captured from the running game and placed on their category colour (Move, Play, Rest, Care, Grow). They are never redrawn.

**Kinds**
- `sky`: the cover, with a title, a line, an island and a glass pill.
- `scene`: a pack's calendar scene above a deep green panel.
- `steps`: numbered glass rows.
- `quest`: the real card.
- `statement`.
- `close`: "Now accepting Founding Families", with Moss and a white pill button.

**Rules**
- Real quests only (`scripts/moss-quests.mjs` exports them from the game).
- No children's faces.
- Always "children do quests in real life… a grown-up approves each quest once it is complete". Never "small quests" or "a grown-up says yes".
