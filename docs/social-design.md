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

**Sources**
- **Look and type:** the new website (repo `hueheal/HueandHeal-Website`, live at hueandheal.netlify.app). It sets the typefaces, scale, colour, lockups and halos.
- **Post structures:** the Hue & Heal Brand Figma, file `qDrGcT3SPOrIuEiVaiBw0E`, frame `170:1124`.
- **Redesign:** 25 Oct 2026, after Maria asked for closer alignment with the website. The type system is recorded in `scripts/post-render/hh/TYPE-SYSTEM.md`.

**Look**
- **Typefaces:** the website's own Newsreader (display optical size for titles, text optical size for ledes) and Poppins. The font files sit in `scripts/post-render/hh/`. The site does not use Ivy Ora.
- **Type scale:** the site's 1.25 ratio, rebased on a 36px body: 29, 36, 45, 56, 70, 88, 110, 138, 172.
- **Colour:**
  - Near-black ground #07080b, with warm white #ece7dd type and #a9a398 secondary text.
  - Room accents on labels and links: Studio coral #d98a6c, Lab jade #8db59c, Mind periwinkle #aeb2da.
  - The italic phrase is warm white over photos. On black it takes the site's peach to lilac gradient.
- **Lockups:** the closing slides carry the room lockup: hue&heal: Studio, Lab or Mind.
- **Kept from the Figma:**
  - cinematic photos fading to black;
  - the tracked eyebrow;
  - the centred cover stack and the pill;
  - "Swipe to see how";
  - halo rings for pauses;
  - labelled "Experience: / Why it works:" slides.
- **Layout:** 80px side margins. Text blocks end on the same line across a carousel.

**Kinds**
- `cover`, `feature` (with its own photo) and `tip` (with its own photo).
- `pause`, `statement` and `close`. These take the room in `kicker`: studio, lab or mind.

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
