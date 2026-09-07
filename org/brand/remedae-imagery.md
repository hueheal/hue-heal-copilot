# Remedae imagery style guide

The single reference for every photograph, illustration and video made for Remedae: the site, social, email, the journal, and anything the Hue & Heal copilot generates. Version 1.1, 7 September 2026. Companion to `design-system.md` (tokens and layout) and `copy_bible_source.md` (voice). The machine-readable version of the prompt library is `content/imagery/prompt-library.json`.

Tool of choice for generation is Higgsfield (image and video) through its MCP at `https://mcp.higgsfield.ai/mcp`. The copilot's own image function currently calls OpenAI with the Remedae master prompt; section 9 says how to move it to this guide.

---

## 1. The one idea

**Traditional medicine through a modern lens.** Every image shows everyday people using the world's healing traditions inside the lives they already live: a modern kitchen, a real living room, a bright street, a park at lunchtime. The shift is away from anything that looks old, distant or reserved for someone else, towards things a reader recognises from their own week and can picture themselves doing tonight. The tradition is visible in the object and the gesture (pouring, steeping, breathing, walking, being examined, chopping ginger), never in costume, ceremony or set dressing. Modern medicine is photographed with the same warmth as everything else: a blister pack on a kitchen table, a pharmacist across a counter, never a white coat in a white corridor.

What "modern lens" means in practice:

- **Homes look like real homes.** Lived-in flats and houses of today: a kitchen with a kettle and a fridge, a sofa with a throw on it, a bedroom with a phone charger, a hallway with shoes. Not heritage interiors, not showrooms, not sets.
- **Families of every shape.** Varied sizes, ages and races: a single parent and a toddler, flatmates, three generations at one table, a couple in their sixties, a teenager and a grandparent. No tradition is illustrated by one ethnicity as a costume, and no family type is the default.
- **Outdoors is bright and current.** A city park at lunch, a doorstep in morning sun, a canal path, a garden, a bus stop, a school run. Today's clothes, today's streets. Nothing that reads as rural nostalgia, period or "olden".
- **Bright, vibrant, warm.** Every image is a warm lifestyle photograph with professional light and grade, consistent across the whole set. No moody low-key frames, no dark or desaturated looks, no filters.

Four tests before an image is used:

1. Could this be a still from someone's actual Tuesday, this year? If it reads as a campaign, a set, or another era, it fails.
2. Is the remedy or practice identifiable without a caption? If the tradition is only in the mood, it fails.
3. Would a photo editor accept it as a professional photograph? If anything reads as rendered, painted, over-sharpened or waxy, it fails outright.
4. Is it bright, neutral-balanced and consistent with the rest of the set? If it needs a grade to match, or carries a colour cast, it fails.

**The calibration pair.** Two Higgsfield frames made by the founder set the bar for the whole set: a tight crop of a woman's hands pressed to her stomach in a green sports top, outdoors in open daylight, background soft, skin and fabric pin-sharp, nothing else in frame. Every generation is judged against them. Keep them at `review/reference/` and pass them as style references wherever the tool allows.

**The failure to learn from.** The copilot's first attempt put six people in one galley kitchen under an orange cast, rendered like a painting, with a man looking into the lens and tunics standing in for Ayurveda. Nothing in it could be pointed to as the remedy. Every rule in section 3 exists to make that image impossible.

## 2. Where the look comes from

**The moodboard** (Figma, Remedae file, node 361-2) sets the register: warm, bright lifestyle photography of everyday people in real modern homes and current outdoor settings, professional and consistent from frame to frame. The strongest assets already live sit inside it.

**Assets on the site today, audited on 7 September 2026.** Twelve files in `public/assets`. Keep: the family on the yellow bean bag (lifestyle-5), the family chopping at the island (lifestyle-4), the man breathing at the window (lifestyle-6), the woman breathing between plants (rituals-hero), the green juice by the window (lifestyle-3). Borderline on brightness, keep for now and replace as the set grows: the pulse being taken in wool sleeves (texture-tcm) and the tea poured onto oak (lifestyle-2), both darker and moodier than the moodboard. Replace as a priority: the "health coach" consultation (texture-modern-medicine), which is a generated image with garbled whiteboard text and a fictional badge, exactly what this guide forbids; and the kitchen shake shot (lifestyle-7), which carries a third-party product brand. Retire when replacements land: the cropped salad shot (lifestyle-1), which reads as stock, and the palm-garden yoga pose (texture-ayurveda), which is a yoga cliché standing in for Ayurveda. Note also that two files are reused for seven different traditions in `content/traditions.ts`; the tradition set in section 5 exists to end that.

---

## 3. The photographic constants

These go into every prompt and every brief. They do not change by category.

**Realism first.** The output must pass as a professional photograph, the kind a picture desk would license: true optical depth of field, real skin with pores and fine hair, fabric with visible weave and creases, honest reflections and shadows. Any hint of a render, illustration, painterly smoothing, over-sharpening, halo edges, waxy skin, or "AI glow" fails the image outright, whatever else it gets right.

**One subject, one action.** Default to a single person doing a single thing with a single named object. Two people only when the module needs it; three at the very most, and only for the connection pillar. Never a crowd, never a group all mid-task, never an ensemble. The copilot's six-person kitchen is the shape to avoid.

**Crop tight by default.** The house shot is close: hands and the object, a torso and the gesture, a face in profile at the window. Wide establishing frames are the exception and must still have one hero. Shot types, in order of how often they should be used:

1. *Macro body*: hands on a belly, a wrist being held, fingers on a temple, a foot on a step. No face, or a partial face out of focus. The calibration pair is this type.
2. *Hands and object*: tearing a sachet, stirring a pan, pouring water, holding a mug. Face optional, cropped at the chin or out of focus.
3. *Portrait mid-task*: head and shoulders, eyes on the task or closed, 85mm, background soft.
4. *Environmental single*: one person, three-quarter or full length, in a real room or street, with the room softly behind them.
5. *Pair*: two people, each doing something different, only where the module calls for it.

**Camera.** Full-frame, 50mm or 85mm for people, 100mm macro for body and object close-ups, f/2 to f/2.8, one clear plane of focus with natural fall-off. Eye level for people; 45 degrees or straight down for objects on a surface. No wide-angle lenses: nothing under 35mm, no distorted rooms, no stretched edges.

**Light.** Bright, natural and neutral: a big window, an open door, morning or afternoon sun, or open shade outdoors. The scene feels flooded with light. Soft shadows with detail in them. Never low-key, never moody, never clinical, never blown.

**White balance and grade.** Daylight-neutral: whites are white, skin is its own colour, greens are green. Warmth comes from sunlight, timber and skin, never from a cast. No orange, sepia, amber or golden wash over the frame. No HDR, no teal-and-orange, no desaturated or grey looks, no vignette, no film-emulation filters, no beauty smoothing. One grade for the whole set: bright, clean, vibrant, believable, the look of a professional lifestyle shoot.

**Colour.** Naturally vibrant: the colours of real clothes, real rooms and daylight. Solid-colour contemporary clothing photographs best (a green top, a sand knit, a white tee). No colour tone is applied to any category of image. Brand colour (mint, and yellow for Remedae+) is added at the UI level, never in the photograph.

**Simplicity.** Besides the subject, at most three objects in frame, and the named object is one of them. Clean surfaces, soft backgrounds through depth of field, generous negative space. No prop dressing, no counters full of things, no decorative clutter.

**People.** Everyday people in today's clothes: basics, knitwear, activewear, denim. Real skin texture, fine lines, flyaway hair, clothing creases. Relaxed and unposed; mid-task, looking at the thing, eyes closed, or in profile, never at the camera. Children to elders, all body types, families of every size and shape. A cast that looks like the UK and its diaspora across every tradition, so no tradition is illustrated by one ethnicity as a costume, and no tradition is signalled by dress: no kurta, kimono, kaftan or tunic as a stand-in for a tradition.

**Never in frame.** Text, captions, signage, logos, packaging brands, UI, watermarks. Scrubs, stethoscopes, white coats, exam tables. Crystals, incense clouds, mandalas, lotus poses, prayer hands, chakra diagrams. Pills spilling from bottles. Spa towels and orchids. Period or heritage interiors, rustic farmhouse styling, anything that reads as another era. Traditional dress as costume. Crowds and ensembles. Eye contact with the camera. Perfect symmetry. Matching smiles.

---

## 4. Video constants

Same world as the stills, moving slowly.

- Length 4 to 8 seconds, loopable where possible; 24 fps; 9:16 for social and the app, 16:9 for the site and journal.
- Motion belongs to the subject, not the camera: steam rising, tea pouring, hands stirring, a chest rising and falling, leaves moving in a window draught. Camera at most a slow push or a gentle handheld drift.
- No speech, no music baked in, no text, no transitions, no speed ramps, no lens flares added in post.
- Light and grade exactly as the stills. A video should look like one of the photographs came to life.

---

## 5. Category modules

Each module is a paragraph appended to the constants. Subject lines then name the specific remedy or moment.

### 5.1 Traditions

One module per tradition. The rule for all thirteen: the tradition shows in the object and the gesture, never in dress or décor; practitioners are everyday professionals in everyday rooms; every object is something the site actually names in a remedy.

**Modern medicine.** A GP's consulting room that looks like a room, a high-street pharmacy counter, a blister pack and a glass of water on a kitchen table, a physiotherapist's hands on a shoulder, a sleep diary on a bedside table. Warmth and eye contact between people. No white coats, no corridors, no monitors.

**Ayurveda.** A kitchen at morning: warm water with lemon in a steel or copper cup, ghee in a small pan, ashwagandha powder stirred into warm milk, sesame oil warmed in the palms, a spice tin with cumin, coriander and fennel. Indian and non-Indian households alike. No temples, no statues, no yoga poses.

**Traditional Chinese Medicine.** A pulse being taken at a wrist, a decoction simmering in a clay pot, jujube and goji on a chopping board, a practitioner's hands at an acupuncture point, congee steaming. Everyday clinic rooms and kitchens. No dragons, no calligraphy walls.

**Kampo.** Granule sachets torn open into a cup, a Japanese pharmacy counter, ginger and jujube on a wooden board, a small ceramic cup on a lacquer tray. Precise, quiet, domestic. No kimono, no temple.

**Unani.** Honey and black seed on a spoon, a glass of rose-water, almonds soaking overnight, a practitioner feeling a pulse, warm oil in a small bottle. Middle-Eastern and South Asian kitchens rendered as homes, not as sets.

**Siddha.** Nilavembu decoction in a steel tumbler, fresh herbs on a banana leaf, a mortar and pestle, a Tamil kitchen with morning light. No shrines.

**Naturopathy.** Hot and cold water at a basin, a steam bowl under a towel, a bowl of whole vegetables mid-prep, a morning walk in a coat. Clinical honesty: the practitioner is in ordinary clothes at an ordinary desk.

**Homeopathy.** A small brown glass vial and pellets on a palm, a pharmacy shelf of small bottles, a practitioner listening. Restraint; the evidence framing on the site is honest, and the image must not promise more than the page does.

**African traditional medicine.** Prefer plants, hands and landscape: rooibos or moringa leaves, a market table of dried herbs, a clay pot on a stove, a grandmother's kitchen. Never ceremony, never masks, never "tribal" styling. Community-controlled framing; when in doubt photograph the plant and the pot.

**Indigenous healing.** The same rule, stricter: plants, water, land, hands, sweetgrass or eucalyptus on a table. No regalia, no sacred objects, no ceremony. When there is no honest everyday image, use a brand texture (section 5.4) instead.

**Functional medicine.** A kitchen table with a food diary and a fibre-rich breakfast, blood-test paperwork beside a coffee, a consultation over a laptop in a bright room. Systems thinking shown as ordinary organisation.

**Lifestyle medicine.** Morning daylight on a doorstep, a post-meal walk, a cool dark bedroom with the phone outside the door, a shared meal, a bike, a kettle switched off after noon. This module overlaps with 5.3 and borrows from it.

**Mind-body medicine.** A hand on the chest and one on the belly, eyes closed at a window, a group course in a community hall with mismatched chairs, a pen and a worry list at night. Breath shown as a body, not as a pose.

### 5.2 Conditions

The condition page hero and rails need two moments per condition.

**The felt experience.** Honest and gentle, never theatrical: awake at 3 a.m. in blue-grey light, a hand pressed to a stomach after a meal, a tissue and a hot drink on a windowsill, a stiff neck stretched at a desk. No grimacing, no clutching, no red-tinted pain, no illness as spectacle. Children's conditions are photographed with a parent present and the child at ease.

**The remedy moment.** The first thing on the page that a reader can do tonight, mid-action: the steam bowl, the warm milk, the walk, the diary. This is the image that leads the page and the social post.

### 5.3 Lifestyle pillars

One module per ACLM pillar, used by the lifestyle band and by Today on Home.

- **Nutrition.** Real food mid-preparation, hands and knives, a plate that looks eaten from. No smoothie-bowl styling.
- **Movement.** Walking, stairs, a bike, stretching in ordinary clothes. Outdoors where possible. No gym mirrors, no activewear campaigns.
- **Sleep.** Cool, dark, quiet bedrooms; morning light through a curtain; a phone charging in another room.
- **Stress.** A pause in an ordinary place: a kettle, a doorstep, a bus stop, a window. Breath and stillness, no meditation cushions.
- **Connection.** Two or more people in the same room doing different things; a shared meal; a phone call on a walk.
- **Substances.** Caffeine and alcohol shown as choices: the last coffee at noon, a glass of water where the wine was. Never moralising.

### 5.4 Brand textures

Abstract, ownable frames for heroes, cards and video loops: steam over a dark cup, sunlight through leaves onto a wall, water poured into a glass, ginger sliced on oak, a linen curtain moving, condensation on a window. Shot close and bright, same grade as everything else; the site's gradient overlay handles the canvas. These are the safe substitutes wherever a tradition cannot be shown honestly.

### 5.5 Ingredients

For the ingredient layer in `kitchen-first-plan.md`, one consistent series so every ingredient reads as part of one set: the ingredient in the form the reader will buy it (fresh root, dried slices, powder, capsule), straight down or at 45 degrees, on a single neutral surface (oak, slate or unglazed clay), one soft directional light, no props beyond a spoon or a bowl, no packaging, no labels. Named by the plain name the site uses.

---

## 6. Surfaces and sizes

- Hero cards on the search hero: 3:4, minimum 1200 by 1600 px. Locked in code; the card overlays tradition name and remedy title, so keep the top and bottom fifths quiet.
- Rails and tiles (conditions, journal, shelf): 4:5, minimum 1200 by 1500 px.
- Condition page and tradition page heroes: 3:2, minimum 2400 by 1600 px, subject in the left two thirds so the title sits right.
- Journal inline image: 16:10 landscape only, minimum 2000 px wide; prefer the actual thing discussed over mood.
- Featured carousel and promo cards: 16:9, minimum 2400 px wide.
- Social: 4:5 for feed (1080 by 1350), 9:16 for stories and reels (1080 by 1920). Leave the top 250 and bottom 300 px of 9:16 free of the subject.
- Email: 2:1, 1200 by 600 px, under 300 KB.
- Video: 9:16 for social and the app, 16:9 for site and journal, 1080p, 24 fps, 4 to 8 s, H.264.

Deliver JPEG at quality 85 for photographs, WebP where the pipeline converts, MP4 for video. Never upscale below the minimum; regenerate instead.

---

## 7. How a prompt is built

Generation models weight the first words most and lose precision in long paragraphs, so the prompt is short and front-loaded. Five parts in this order, under 120 words in total before the negatives.

1. **Subject line** first: shot type, who, doing what, with which named object, where, time of day. Twenty to forty words. Name the remedy as the site names it.
2. **Realism spec**: the fixed phrase from the prompt library (`master.image`), about fifty words of camera, light and texture.
3. **Module**: one short line from section 5, trimmed to the objects and the setting.
4. **Surface spec**: aspect ratio, orientation, where the quiet area is.
5. **Negatives**: the fixed list from the library, passed to the negative-prompt field where the tool has one.

Then generate four, pick one, and put the rest through the checklist in section 9. Reference images: pass the calibration pair as style references whenever the tool supports it.

Three worked prompts in the new shape:

- **Condition, gut ache, macro body, 4:5.** "Macro body shot: a woman's hands pressed flat to her stomach over a plain green sports top, outdoors in open morning daylight, hills soft in the background, no face."
- **Tradition, Ayurveda, hands and object, 3:4.** "Hands-and-object shot: a woman's hand stirs ashwagandha powder into a small pan of warming milk on a modern hob, bright window light from the left, one mug beside the pan, cropped at the shoulders."
- **Lifestyle, sleep, portrait mid-task, 9:16.** "Portrait mid-task: a man in his sixties in a plain white tee opens a bedroom curtain to bright morning light, in profile, eyes on the window, the room soft behind him."

---

## 8. Naming, storage, provenance

**File names:** `{category}-{subject}-{variant}.{ext}` in lowercase with hyphens. Category is one of `tradition`, `condition`, `lifestyle`, `brand`, `ingredient`. Subject is the site's slug where one exists. Variant is a two-digit index.

Examples: `tradition-kampo-rikkunshito-01.jpg`, `condition-insomnia-felt-01.jpg`, `condition-insomnia-remedy-01.jpg`, `lifestyle-sleep-morning-curtain-01.mp4`, `brand-texture-steam-02.jpg`, `ingredient-ginger-fresh-01.jpg`.

**Location.** Site assets in `public/assets/{category}/`. Bulk libraries in the Supabase storage bucket the site already allows images from; which bucket is the master library is not yet decided (section 10).

**Sidecar.** Every generated file gets a `.json` beside it with: prompt (all five parts), tool and model, seed where available, date, who approved it, and the surface it was made for. Without a sidecar an image cannot be regenerated consistently and should not be used.

---

## 9. Review before use

1. Passes the four tests in section 1 and holds up beside the calibration pair.
2. No text, logos or brands anywhere in frame, including on packaging, clothing and books.
3. Reads as a photograph, not a render: no waxy skin, halo edges, painterly smoothing, over-sharpening or glow. Hands and faces anatomically right; count fingers, check teeth and ears.
4. Neutral white balance: whites are white, no orange or sepia cast.
5. One subject, one action, at most three objects; the crop is as tight as the shot type allows.
6. The named object is the real object (a Rikkunshito sachet, not a generic pouch; fresh ginger, not galangal).
7. No tradition is shown through costume or dress, ceremony or sacred objects.
8. The cast across a set is mixed in age, body and ethnicity, and no tradition is illustrated by one ethnicity only.
9. Lower third or an edge is quiet enough for overlaid type on the surface it is made for.
10. Bright and consistent with the set without a grade change.
9. Correct ratio and minimum size for its surface; not upscaled.
12. Sidecar written and file named to the convention.

---

## 10. Setting up the tools

**Higgsfield MCP.** The endpoint is OAuth-protected, so it has to be added and authorised from an interactive Claude Code session:

```bash
claude mcp add --transport http higgsfield https://mcp.higgsfield.ai/mcp
```

Then run `/mcp` in that session and complete the Higgsfield login. Once connected, generations are requested with a prompt built from section 7; keep the sidecar from the tool's response.

**Figma moodboard.** Reading the file from an automated session needs either the Figma connector authorised in claude.ai connector settings, or the moodboard frames exported as PNG into `review/moodboard/` in this repository. Either path lets the guide be refined against the board frame by frame.

**Handover to the copilot.** Three changes in `~/Claude/hue-heal-copilot`: replace the Remedae `image_master_prompt` and `image_negatives` seeds in `src/lib/brand.ts` (and the seeded row in `brand_profiles`) with `master.image` and `negatives` from the prompt library; add the category modules and surface specs so a seat picks a category and a surface rather than a preset; and update `org/tools/higgsfield.md` from "connectable" to the connected state with the request rule (a seat asks, the founder grants). A copy of this guide for the org folder is at `org/brand/remedae-imagery.md` once the handover is made.

**Still to decide.** Which storage bucket is the master library. Whether ingredient photography is generated or shot, given the layer needs several hundred consistent frames.
