# Remedy card review, regenerated set of 13 and 14 September 2026

Reviewed by the copilot expert seats (lead, modern medicine, traditional medicine): all 235 cards across 36 conditions, against rules 5a2 and 5a3 in lib/extractor/prompts.ts, the conditions-page spec, and the seat charters.

Note from the pipeline owner: the reviewers flagged ~100 truncated sourcing and research fields; that was an artifact of the review export (fields cut for the reviewers' file), verified absent in the database. The 15 orphan quote marks were real and have been cleaned.

## 1. Rule compliance
32 cards have empty steps arrays where steps are mandatory. Roughly 30 still break one-remedy or steps rules: 14 stack multiple treatments, at least 8 smuggle diet rules or a second formula into steps. Worst ten: hypertension-ayurveda-1 (five treatments in one card), wound-healing-ayurveda-1 (tablets + dressing + three diet steps), low-mood-ayurveda-1 and postnatal-depression-ayurveda-1 (four products as one "tonic"), hip-pain-ayurveda-1 (practitioner therapy + second oral formula), pcos-ayurveda-1 (two formulas), insulin-resistance-unani-1 (tablet + juice + regimen), fertility-ayurveda-1 (three churnas), aching-joints-unani-1 (oil + tablets in the title), depression-modern-1 ("antidepressant or structured exercise" as one card).

## 2. Safety flags (modern medicine seat)
24 herbal or supplement cards carry no extracted safety items (the render-time baseline still shows generic cautions, but the specific risks are absent). A pharmacist would stop first: hypertension-ayurveda-1 (self-dosed Rauwolfia serpentina, reserpine-class); muscle-cramps-modern-1 (ibuprofen schedule totalling 2400mg daily, double the OTC ceiling); kids-cough-tcm-1 (8-herb home decoction for a child incl. apricot kernel, no paediatric dose); kids-fever-tcm-1 (honey for a febrile child, no infant botulism note); kids-fever-siddha-1 (no dose, no age floor); bedwetting-siddha-1 and bedwetting-ayurveda-1 (adult ashwagandha doses on child cards); kids-eczema-functional-1 (adult elimination-diet template incl. "alcohol" on a child card); diabetes-unani-1 and insulin-resistance-unani-1 (hypoglycaemic herbs, "comparable to metformin", no interaction flag); early-cold-ayurveda-1 (licorice, no BP/pregnancy caution); nausea-for-pregnancy-kampo-1 (licorice-containing formula in pregnancy on non-pregnant evidence); aching-joints-kampo-1 and joint-pain-kampo-1 (steps advising combining with NSAIDs); wound-healing-tcm-1 (astragalus 30g, no immunosuppressant flag); hip-pain-african-1 and aching-joints-african-1 (benchmarked against rofecoxib, withdrawn 2004).

## 3. Tradition fidelity (traditional medicine seat)
sluggish-mornings-siddha-1 attributes Siddha content to Ayurveda. hip-pain-tcm-1 names Mu Gua as motherwort (it is quince); muscle-cramps-tcm-1 says "add papaya", a literalised mistranslation. sluggish-mornings-kampo-1 glosses xue as qi. bedwetting-tcm-1 glosses kidney qi as "the stress-pattern" and cites AYUSH for a Chinese formula. shoulder-pain-tcm-1, tennis-elbow-tcm-1 and pms-kampo-1 misgloss patterns. Kampo cards route to BAcC acupuncturists or Indian sourcing. Native-term slot holds disease or pattern names instead of remedy names on at least 8 cards. Wrong condition mapping: snoring-mind-body-1 is an insomnia card; muscle-cramps-modern-1 is menstrual cramps; diabetes-lifestyle-1 argues from dementia prevention; sluggish-mornings-functional-1 opens with insomnia. Formula recycling: Xiao Yao San on 6 cards, Du Huo Ji Sheng Tang on 6, Sokeikakketsuto on 5, Amukkara chooranam on 4.

## 4. Readability
52 cards with steps contain no numeral at all. Worst: fertility-unani-1, pms-unani-1, irregular-periods-unani-1, bedwetting-tcm-1, kids-fever-siddha-1, kids-cough-unani-1, flu-unani-1 ("using all seven herbs", never named), pcos-tcm-1, tennis-elbow-tcm-1, bedwetting-lifestyle-1.

## 5. Five highest-leverage rule changes
1. Hard schema gate: recipe and practice cards must ship at least two steps, each with a quantity, frequency or duration.
2. Define native_term as the remedy's name in its tradition, never a disease or pattern name, with examples.
3. Title test for 5a2: a title or ingredient list naming two or more sellable products is rejected and re-extracted.
4. Condition-echo verification: claim and cited study must name the card's condition or the pane downgrades.
5. Tradition glossary lock for the voice layer: pattern glosses come from a fixed lookup, and sourcing bodies must match the card's tradition.
