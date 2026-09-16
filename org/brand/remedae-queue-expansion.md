# Unresolved-search queue triage and corpus research, September 2026

Prepared by the chief scientific officer seat with the product seat. Read-only pass against the live database on 16 September 2026. 26 open rows in `unresolved_queries`, 17 distinct topics. Corpus research delivered in the remedae repo at `review/queue-expansion-2026-09/entries.json` (13 entries, `tradition_corpus` insert shape, validated JSON). Nothing has been written to the database.

## Triage table (every open row)

| Topic | Hits | Classification | Action |
|---|---|---|---|
| osteoporosis | 4 | SERVED | `osteoporosis` is published. Close rows on review. |
| fertility | 3 | SERVED | `fertility` is published. Close rows on review. |
| pms | 3 | SERVED | `pms` is published. Close rows on review. |
| fibromyalgia | 2 | SERVED | `fibromyalgia` is published. Close rows on review. |
| gum pain | 2 | GAP | No published page (`gum-pain` sits in draft, all tradition extractions had failed). 8 corpus entries delivered. |
| geographic tongue | 1 | GAP | No published page (`geographic-tongue` in draft). 3 new corpus entries delivered; 2 further candidates were already in the corpus. |
| g6pd | 1 | GAP | No published page (`g6pd` in draft). Interest email attached. 2 new corpus entries delivered; corpus already holds g6pd lifestyle entries. |
| glucose 6 phosphate deficiency | 1 | GAP | Same condition as g6pd, separate draft slug `glucose-6-phosphate-deficiency`. Recommend aliasing to one slug on regeneration. |
| pelvic pain | 1 | SERVED | `pelvic-pain` is published. Close row on review. |
| cognitive decline | 1 | SERVED | `cognitive-decline` is published. Close row on review. |
| ulcer | 1 | SERVED | `ulcer` is published. Close row on review. |
| long covid | 1 | SERVED | `long-covid` is published. Close row on review. |
| snoring | 1 | SERVED | `snoring` is published. Close row on review. |
| wound healing | 1 | SERVED | `wound-healing` is published (a separate `slow-wound-healing` draft also exists). Close row on review. |
| osteoarthritis | 1 | SERVED | `osteoarthritis` is published. Close row on review. |
| arthiritis | 1 | SERVED | Typo for arthritis; `arthritis` is published. Close row on review. |
| fly | 1 | GARBAGE | Not a health condition (ICD found no match). Close row on review. |

Note for the seats: the brief expected ulcer and cognitive decline to be gaps. Against the live database both now have published pages, so they are classified SERVED. The real gaps are gum pain, geographic tongue, and g6pd deficiency (two slugs, one condition).

## What was researched per GAP condition

Every passage in `entries.json` is verbatim abstract text fetched this session from NCBI E-utilities (PubMed), with an attribution line, a blank line, then the body. All source URLs were checked reachable. Duplicates against the existing `tradition_corpus` were checked by `source_url` and dropped.

### Gum pain (gingivitis, periodontitis) - 8 entries

- Modern, guideline: EFP S3 level clinical practice guideline for stage I to III periodontitis, J Clin Periodontol 2020. Strong evidence, the reference standard for stepwise periodontal care.
- Modern, review: Cochrane 2017 on chlorhexidine mouthrinse as an adjunct for gingival health. High-certainty reduction in gingivitis and plaque over 4 to 6 weeks. Chlorhexidine is a pharmacy medicine, so dosing rule 4 applies downstream: name it, route to the pharmacist, no dose on the card.
- Lifestyle, review: Cochrane 2019 on home use of interdental cleaning devices in addition to toothbrushing. Low to very low certainty, favours floss and interdental brushes for gingivitis.
- Lifestyle, review: 2026 systematic review and meta-analysis in Frontiers in Oral Health on smoking cessation and periodontitis progression. Moderate observational evidence that quitting slows progression.
- Ayurveda, review: 2023 systematic review and meta-analysis of Ayurvedic and herbal plaque control agents in gingivitis. Moderate evidence, multiple distinct agents.
- Ayurveda, review: 2017 review of oil pulling for oral hygiene, J Tradit Complement Med. Low evidence, genuine traditional practice with published literature.
- Unani, review: 2021 systematic review of the Salvadora persica (miswak) chewing stick versus toothbrush for plaque and gingivitis, J Ethnopharmacol. Moderate evidence for an authentic Unani and prophetic-medicine practice.
- Naturopathy, review: 2021 systematic review of aloe vera as a local agent in periodontal disease, J Indian Soc Periodontol. Low to moderate evidence.

Safety notes: no pharmacological doses appear as instructions in any passage; study quantities stay in research context per the dosing policy. Persistent gum pain with swelling or fever needs a dentist, which the safety floor already covers.

### Geographic tongue (benign migratory glossitis) - 3 new entries

- Modern, review: JDDG 2023, "Geographic tongue: What is this disease?". Etiology, psoriasis association, microbiota findings.
- Modern, review: 2018 systematic review in Rev Clin Esp on predisposing factors, diagnosis and treatment. 33 studies, 4998 patients. Associations with psoriasis, allergies and anxiety; the only clinical trial used topical 0.1% triamcinolone acetonide with or without retinoic acid. Triamcinolone is prescription territory, research pane only.
- Modern, review: StatPearls (NCBI Bookshelf) overview, current edition.

Two further strong candidates (the 2023 worldwide prevalence meta-analysis and the 2018 Clin Oral Investig treatment systematic review) are already in the corpus from an earlier pass and were dropped as duplicates. Evidence strength overall is low: the condition is benign and usually needs no treatment, which is itself the honest message. No traditional-system literature met the bar (case reports and cross-sectional pilots only), so no traditional entries were stretched in. The lifestyle pane may stay thin; irritant avoidance (hot, spicy, acidic food when symptomatic) lives inside the modern reviews.

### G6PD deficiency (favism) - 2 new entries

- Modern, review: Luzzatto et al, Blood 2020. Names the triggers explicitly: fava beans, oxidative drugs (primaquine, rasburicase), infection. This is the passage the avoidance-as-treatment rule extracts from.
- Modern, review: Cappellini and Fiorelli, Lancet 2008. States plainly that the most effective management is preventing haemolysis by avoiding oxidative stress.

The corpus already holds g6pd lifestyle entries from a prior pass (dietary restrictions for G6PD deficiency; adverse effects of herbal or dietary supplements in G6PD, a systematic review; exercise in G6PD deficiency) plus modern primaquine and tafenoquine reviews, so lifestyle coverage was not duplicated. The 2018 NEJM favism review was considered and skipped: PubMed carries no abstract, so no verbatim passage could be copied this session.

Safety notes: G6PD is the one condition here where a "remedy" from any tradition could be actively dangerous. Herbal and dietary supplements have documented haemolysis reports in G6PD (that systematic review is already in the corpus and should surface in the safety band). The page must lead with trigger avoidance and screening, never with substances. Two draft slugs exist for the same condition; recommend one canonical slug with the other as an alias before regeneration.

## Waiting readers

One open row carries an interest email:

- g6pd: 1 reader waiting - sherrell667@icloud.com

No other open row has an interest email attached.

## Recommended next steps for the founder

1. Approve the 13 corpus entries; seed via the normal corpus path, then regenerate gum-pain, geographic-tongue, and one canonical g6pd slug through the pipeline.
2. Decide the g6pd canonical slug and alias, and whether to send the ready email to the waiting reader once published.
3. Close the SERVED and GARBAGE rows from /admin/queue.

Nothing closed, generated or emailed. Awaiting the founder's review.
