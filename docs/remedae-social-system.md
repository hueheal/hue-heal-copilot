# Remedae · Instagram template system

The Remedae workspace has its own social template family in the Social Studio.
It never mixes with Hue & Heal's set: Remedae sees only these 23 templates, Hue
& Heal sees only its house set. Code: `src/lib/social/remedae.ts`, wired
through `templatesFor()` / `defaultTemplateFor()` in `src/lib/social/templates.ts`.
Contact sheet of every template: `/templates?format=portrait|carousel|story|square&photo=1`.

## Sources

- Remedae Figma, "Social Media" page (Cover Editorial, Quick Glance dark/light,
  Recipe, Editorial, Editorial 2, Journal): the visual language. 4:5 canvases,
  Quando headlines with one mint word, Poppins everything else, pill chips,
  photo with gradient scrim, evidence badge, numbered steps, quiet "Read ›" cue.
- Claude design "Instagram Hook Templates" (question, number, list tease,
  reframe, POV, quiz, save, short cover, six opener) plus its post set (remedy
  spotlight, editorial cover, pull quote, recipe, evidence, rhythmic type,
  Remedae+ promo): the hook logic and the "one hook, one promise, one cue" rule.

## The family

Grouped by what the post is trying to earn. Every template exists in
portrait (4:5), square, story (9:16, safe zones respected) and as a carousel
cover; carousels get Remedae body slides and a closing "read the full piece"
slide automatically.

| Earns | Template | Shape |
|---|---|---|
| Comments / curiosity | The question | One question, answer withheld to the caption |
| | The number | One big mint stat over a photo, then the statement it completes |
| | The quiz | A clue, four tradition pills, "say it in the comments" |
| Swipes | List tease | N things promised, two shown, the rest withheld as bars |
| | Six traditions | Six names, one ache, "start with TCM" |
| | The reframe | Told (struck through) vs what the traditions say |
| Saves | The save · cream | A whole small reference on cream paper, tradition by tradition |
| | Quick glance | "5 remedies for X" as cards with tradition · type tags |
| | Recipe card | Tradition header, evidence badge, method, time/type/daily, you'll need / how to |
| | Evidence card | What the research finds / what it does not yet show |
| Reads (article promotion) | Editorial cover | Full-bleed hero, category + years pills, title, dek, Deep Dive › |
| | Editorial split | Hero top, cream panel, category + read time, author, Read › |
| Watch time | Short cover | Practitioner photo, on-camera line, name and credentials |
| | The POV | Timestamp, two words, second-person body |
| Brand / voice | Remedy spotlight | One word set enormous, Latin name, three fragments |
| | Pull quote | One resonant sentence, source line |
| | Three words | Sleep. Sun. Breath. |
| Product | Remedae+ promo | The only place the yellow appears |
| Infographic / text-heavy | Orbit diagram | Six traditions on rings around "you", over ground or photo |
| | Numbered steps | 01 to 04 glass rows over a photograph |
| | The list · cream | Hanging numerals, a narrow measure, a line of why under each item |
| | Habit cards | Four cream cards on a photo, headline between them |
| | Myth · truth | The belief struck through, what the traditions say beneath |

## Rules baked into the templates

0. Quando is for headlines, remedy names and quotes only. Every line that can
   run long (list lines, bodies, notes, deks) is Poppins. Rows size themselves
   from their text (`stackUp` + `linesFor`), long items are clipped at a word
   boundary, and every headline steps its size down until it fits its box, so
   real article titles and headings cannot overflow.

1. One idea per plate. One cue per post, always the last line before the
   footer, always ending in ›.
2. Headline: Quando, one *phrase* in mint italic. In the studio, wrap a phrase
   in `*asterisks*` to set it. The copywriter does this itself for Remedae.
3. Ground: deep forest (#0e1a12) by default, charcoal for POV / end slides,
   cream (#ffffe8) for the reference "save" posts. Yellow (#fff236) only for
   Remedae+.
4. Photos always sit under a forest-tinted gradient scrim (`scrimTint`) so
   cream type stays legible; templates that own their ground (`noPhoto`)
   never take the post photo, even when the draft has one.
5. Legibility floor: nothing under 22px on the 1080 canvas (~8px on a phone).
   The Claude set's 11 to 13px eyebrows and labels were raised for this reason.
6. One piece of chrome per slide: the wordmark, bottom-left, small. No
   bottom-right label, no top-right meta, no "save for later" or page counters
   in the corners; those tracked micro-labels are the signature of a generated
   template. Counters live in the carousel body index; disclaimers live in
   the caption ("Traditionally used, not medical advice."). The two pills on
   the Editorial cover stay because they are Remedae's own Figma design.
9. No empty placeholder boxes: a missing thumbnail or avatar becomes an
   initial-letter mark. Lists are editorial (hanging numerals, a narrow
   measure, rules under the text column), never tick-circle stacks.
7. Story keeps 220px top and 260px bottom clear (profile bar, reply bar).
8. Traditions are named (TCM, Ayurveda, Unani, Kampo, Native American, modern
   medicine), never "ancient wisdom". "Not medical advice" sits in the label
   of anything that reads as instruction.

## Why these shapes (the evidence, briefly)

- Instagram ranks feed and Explore mainly on saves, shares, sends and dwell,
  with comments and likes behind. So the family is weighted toward posts
  people keep (save, glance, recipe, evidence) and posts that hold attention
  (carousels, which also get a second impression when a viewer does not swipe).
- The first 1.5 seconds decide the stop. Every cover has one dominant element
  (a question, a number, a word) at 84 to 250px, high contrast, and nothing
  else competing.
- 4:5 is the largest feed footprint; it is the default and the carousel size.
- Curiosity gaps (question, withheld list items, quiz) reliably raise comment
  and swipe rates; "told vs actually" reframes are the highest-performing
  educational shape because they resolve a felt tension.
- Reference posts on a paper-like ground read as something to file; the
  cream save card is deliberately the odd one out in a dark grid.
- Consistent placement of the mark and a label makes screenshots and shares
  attributable, which is where Remedae's reach compounds.

## Using it

- Create → Social → any format opens the staged flow: 1) name the topic,
  2) choose a template from live previews, 3) edit copy and imagery on the
  canvas. The copy is written for the template you picked. Posts arriving with
  content (an article, a daily post) skip straight to the editor.
- In a carousel, the template chips act on the selected slide: on the cover
  they restyle the cover, on a body slide they swap that slide's layout alone
  (any template, or back to the standard numbered Body layout). Per-slide
  layouts survive a copy rewrite.
- Article → Instagram from a journal piece opens on the Editorial cover with
  the hero, article images on the body slides they belong to, and the closing
  slide pointing to remedae.app.
- Brief the copilot inside the studio: the writer knows which template is
  active and writes in that hook's shape (The number arrives as "3bn |
  statement" and lands in the stat element).
- Switch templates freely; edited text carries over by role, and photos only
  carry to templates that take them.
