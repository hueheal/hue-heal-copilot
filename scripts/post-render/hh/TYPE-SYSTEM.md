# Hue & Heal posts: type system

Canvas 1080 x 1350. Seen on a phone the post is about 360 to 390px wide, so every canvas
pixel is roughly a third of a phone pixel. Nothing that must be read is under 26px on the
canvas (about 9px on the phone); body copy is 36px (about 13px).

## Where it comes from

Everything is taken from the new website (`src/styles/global.css`, `docs/COLOUR-SYSTEM.md`,
the Halo cards of the Design Your Next Chapter deck, the homepage and room heroes), then laid
on the post structures from the Brand Figma.

- **Two voices, as on the site.** Newsreader (variable, with optical size) for every title,
  lede and the swipe cue. Poppins for body copy and small text. The font files are the site's
  own @fontsource 5.3 builds (OFL, licences beside them in `scripts/post-render/hh/fonts`).
  Ivy Ora is gone: the site does not use it.
- **The site's display recipe.** Light 300 at opsz 72 with negative tracking for headlines;
  350 at opsz 36 for ledes; italic for the one emphasised phrase.
- **The site's scale ratio, 1.25,** rebased on 36px so body copy reads at phone size.
- **The site's colour tokens.** `--screen` #ece7dd for type, `--mute` #a9a398 for secondary
  type, the Halo card black #07080b as the ground. Room accents carry small type (labels,
  links), as COLOUR-SYSTEM.md allows: Studio coral #d98a6c, Lab jade #8db59c, Mind periwinkle
  #aeb2da. With no room named, labels take the site's label lilac #c7b9e6.
- **The emphasis rule from the site.** Over a photograph the italic phrase is warm white
  #fff8ef (room heroes). On a dark ground it is the signature gradient, peach #f2a98e to lilac
  #d49bc9 to blue #9fb6ee (the site's `--em`).
- **Halos the way the site uses them.** The pause is the Halo card ring, word in the dark
  centre. The close slide uses the room mist (the site's `.halo`: main, depth, complement in
  soft light) with the room's own lockup, hue&heal: Studio, Lab or Mind.
- **From the Figma:** full bleed photography fading to black, the tracked eyebrow at the top,
  the centred cover stack (sans line, large serif with italic, sans line, glass pill),
  "Swipe to see how", rings on black for pauses, left aligned "Experience: / Why it works:"
  example slides.

## Scale

1.25 on 36: 29, 36, 45, 56, 70, 88, 110, 138, 172. The eyebrow sits at 26, a step under 29,
because tracked capitals read larger than their size.

## Roles

| Role | Family | Weight | Size | Line height | Tracking | Colour | Used on |
|---|---|---|---|---|---|---|---|
| Eyebrow | Poppins, capitals | 500 | 26 | 1.3 | 0.24em | #ece7dd at 80% | top of every slide, baseline 68px from the top |
| Kicker | Poppins | 500 | 45 | 1.2 | -0.005em | #ece7dd | the small lines above and below the cover title |
| Display XL | Newsreader opsz 72 | 300 | 172 (floor 104) | 0.94 | -0.032em | #ece7dd | cover title |
| Display L | Newsreader opsz 72 | 300 | 110 (floor 66 to 80) | 0.98 | -0.026em | #ece7dd | feature, tip, statement titles |
| Display M | Newsreader opsz 72 | 300 | 88 (floor 62) | 1.04 | -0.02em | #ece7dd | close question |
| Pause word | Newsreader opsz 72 | 300 | 138 (floor 90) | 1.0 | -0.03em | #ece7dd | inside the ring |
| Lede | Newsreader opsz 36 | 350 | 45 | 1.28 | -0.01em | #a9a398 on black, #ece7dd at 86% on photo | statement, close and pause body, feature standfirst |
| Body | Poppins | 300 | 36 | 1.5 | -0.005em | #ece7dd at 86% | tip lines, feature lines |
| Label | Poppins | 500 | 36 | inline | 0.005em | room accent | "Experience:", feature kicker |
| Pill | Poppins on site glass | 500 | 29 | 1.2 | 0.005em | #ece7dd | cover note |
| Link | Poppins | 500 | 36 | 1.3 | 0.005em | room accent | close CTA |
| Footer cue | Newsreader opsz 36, italic | 300 | 36 | 1 | 0 | #ece7dd at 80% | "Swipe to see how" with a hairline arrow, 62px from the foot |
| Lockup | wordmark SVG | | 44 high | | | #ece7dd | close, 96px from the foot |

## Layout

- Side margins 80px on every slide.
- Every photo slide's text block ends on one line, 156px from the foot, so a carousel's
  baselines match from slide to slide; the cue sits under it.
- The photo darkens just above where the words begin (the fade is set from the measured top
  of the text block), so a tall stack never sits on bare photograph. Type over photos carries
  the site's soft dark glow.
- Titles use balanced line breaks; body uses pretty wrapping against widows. Display lines
  carry 0.08em of space below for descenders.
- Long copy steps down 4% at a time to the floor of its role, checking height and width.
  A short title that would leave one word on a second line is drawn back onto one line if
  that costs no more than an eighth of its size.
- The room comes from `kicker` (studio, lab or mind) on pause, statement and close, otherwise
  from the eyebrow: coaching, Mind or creative words mean Mind; Lab, Remedae, Moss Island or
  product mean Lab; experience design, Studio, wellness design, hospitality, spa or hotel mean
  Studio. Anything else is neutral.
