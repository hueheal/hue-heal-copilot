# Endometriosis and PCOS corpus research

Chief scientific officer seat, 16 September 2026. Companion file: `entries.json` in this folder, 34 passages in the `tradition_corpus` insert shape. Every passage is verbatim abstract text fetched this session from PubMed (NCBI E-utilities), with an attribution line (first author, journal, year) above it, matching the pattern `lib/generate/recover.ts` writes. All 34 source URLs were fetched and returned 2xx this session. Nothing is paraphrased, nothing is fabricated.

Counts: endometriosis 15 passages across 7 traditions, PCOS 19 passages across 8 traditions. Two passages (the ESHRE endometriosis guideline and the 2023 international PCOS guideline) exceed 6000 characters at source and are truncated at the 6000 character cap, same as the pipeline's own inserts.

## Endometriosis

**Modern (2 remedies).** The ESHRE 2022 guideline (Hum Reprod Open, PMID 35350465) is the anchor passage: hormonal treatment options, analgesia, surgery, fertility. Second remedy: laparoscopic surgery, via the 2020 Cochrane review (PMID 33095458), moderate certainty evidence that laparoscopic treatment reduces overall pain. Evidence strength: strong, guideline and Cochrane grade.

**TCM (3 remedies).** The 2012 Cochrane review of Chinese herbal medicine for endometriosis (PMID 22592712) found CHM comparable to gestrinone and danazol post surgery with fewer side effects, from two small trials of limited quality. A 2023 meta-analysis (Am J Chin Med, PMID 37120704) covers CHM alone or with conventional therapy for endometriosis associated pain. Third distinct remedy: Salvia miltiorrhiza containing formulas combined with GnRH agonist post operatively (Front Pharmacol 2022, PMID 35250579). Evidence strength: low to moderate, trial quality is the recurring caveat.

**Kampo (1 remedy).** Tokishakuyakusan as add on to low dose oral contraceptives in endometriosis patients with dysmenorrhea (J Obstet Gynaecol Res 2020, PMID 32840017), a small 12 patient study. Evidence strength: preliminary. I looked for Keishibukuryogan clinical evidence in endometriosis and found only a mechanism review that never names the condition, so it was excluded (see omissions).

**Naturopathy (3 remedies).** N-acetylcysteine: 2023 Italian clinical study on endometriosis pain, endometrioma size and fertility outcomes (PMID 36981595). Melatonin: 2023 randomized double blinded placebo controlled trial for endometriosis associated pelvic pain (PLoS One, PMID 37267394). Dietary supplements generally: 2016 Cochrane review of supplements for dysmenorrhoea including endometriosis related dysmenorrhoea (PMID 27000311), which found no high quality evidence, a useful honesty anchor. Evidence strength: preliminary to low.

**Mind-body (2 remedies).** Acupuncture: 2011 Cochrane review of acupuncture for pain in endometriosis (PMID 21901713), one trial suggesting benefit. Yoga: 2017 randomized controlled trial of an 8 week Hatha yoga programme for pain and quality of life (PMID 27869485). Evidence strength: low, small trials.

**Lifestyle (2 remedies).** Physical activity and exercise: 2021 systematic review (BMC Womens Health, PMID 34627209). Dietary interventions: 2024 systematic review and meta-analysis of RCTs (Reprod Sci, PMID 39358652). Evidence strength: low to moderate, heterogeneous interventions.

**Functional (2 remedies).** Low FODMAP diet: the 2025 EndoFOD randomised crossover trial for gastrointestinal symptoms in endometriosis (Aliment Pharmacol Ther, PMID 40319391). Food group and nutrient patterns and endometriosis risk: 2022 systematic review and meta-analysis of observational studies (Nutr J, PMID 36138433). Evidence strength: the FODMAP RCT is genuinely encouraging; the risk association work is observational.

## PCOS

**Modern (3 remedies).** The 2023 international evidence based PCOS guideline (Hum Reprod, PMID 37580037), body tagged ESHRE as co publisher. Metformin and insulin sensitising drugs: 2017 Cochrane review (PMID 29183107). Letrozole for ovulation induction: 2022 Cochrane review (PMID 36165742), letrozole improves live birth over clomiphene. Evidence strength: strong. Both drugs are prescription medicines; dosing policy rule 4 applies on any card.

**TCM (3 remedies).** Chinese herbal medicine for subfertile women with PCOS: 2021 Cochrane review (PMID 34085287), insufficient evidence as standalone. Berberine: 2019 systematic review and meta-analysis on reproduction and metabolism (PMID 31915452). Cangfu Daotan decoction with Diane-35 in phlegm dampness PCOS: 2026 meta-analysis (Front Med, PMID 41797761). Evidence strength: low to moderate.

**Kampo (1 remedy).** Unkei-to: 2001 randomised study in 100 anovulatory women with high LH, 38 of them with PCOS, showing LH reduction, estradiol rise and follicle development (J Reprod Med, PMID 11396371). Evidence strength: preliminary, single centre, old.

**Ayurveda (1 remedy family).** 2023 scoping review of Ayurveda studies in women with PCOS (J Integr Complement Med, PMID 36944117), covering the named formulations studied to date. Evidence strength: preliminary; the individual trials are small and heterogeneous. No single named formulation had a fetchable standalone trial abstract strong enough to carry its own entry this session.

**Naturopathy (4 remedies).** Myo-inositol and D-chiro-inositol: the 2024 systematic review and meta-analysis commissioned to inform the 2023 international guideline update (J Clin Endocrinol Metab, PMID 38163998). Spearmint tea: 2010 randomised controlled trial showing anti androgen effects (Phytother Res, PMID 19585478). N-acetylcysteine: 2025 systematic review and meta-analysis (Nutrients, PMID 39861414). Cinnamon: 2020 systematic review and meta-analysis on metabolic parameters (J Ethnopharmacol, PMID 32151755). Evidence strength: inositol moderate, the rest preliminary to low.

**Mind-body (3 remedies).** Acupuncture: 2025 Cochrane review (PMID 41147529). Mindful yoga: 2020 randomised controlled trial showing improved androgen levels (PMID 32285088). Mindfulness based interventions: 2026 meta-analysis on psychological distress, hyperandrogenism and metabolic profile (PMID 42538604). Evidence strength: low to moderate.

**Lifestyle (2 remedies).** Lifestyle change programmes: 2019 Cochrane review (PMID 30921477). Dietary interventions ranked: 2024 systematic review and network meta-analysis (Reprod Health, PMID 38388374). Evidence strength: moderate; lifestyle is first line in the international guideline.

**Functional (2 remedies).** Vitamin D supplementation for ovulation and pregnancy outcomes: 2023 systematic review and meta-analysis (Front Endocrinol, PMID 37593349). Low glycemic index diet: 2021 systematic review on reproductive and clinical profile (Heliyon, PMID 34820542). Evidence strength: low to moderate.

## Deliberately left out, and why

- **Unani.** CCRUM linked trials found on PubMed address primary dysmenorrhea and menorrhagia (for example Juniperus communis, PMID 39842749), not endometriosis or PCOS. Tagging them to either condition would stretch the indication. Nothing entered.
- **Siddha.** The only PCOS specific Siddha paper found is a diagnostic urine test study (PMID 41393437), not a remedy. Nothing entered.
- **Homeopathy.** No randomised placebo controlled trials for either condition surfaced on PubMed. Per the brief, skipped rather than stretched.
- **African and indigenous.** No condition specific published research from credible bodies located this session. Skipped.
- **Ayurveda for endometriosis.** Only a single case report (PMID 38237453) exists; a case report cannot anchor a corpus passage. Skipped.
- **Keishibukuryogan (Kampo).** The available review (PMID 35004802) is mechanistic and never names endometriosis or dysmenorrhea in its abstract, so honest indication_terms were impossible. Excluded.
- **Unkei-to amenorrhea study (PMID 14696679).** Does not name PCOS in the abstract. Excluded in favour of PMID 11396371, which does.
- **Cochrane acupuncture for PCOS 2016 (PMID 27136291).** Superseded by the 2025 update already included.
- **Aloe vera Ayurvedic formulation for PCOS (PMID 21731374).** Rat model, preclinical. Excluded.
- **NSAIDs for dysmenorrhoea Cochrane (PMID 26224322).** Primary dysmenorrhoea focus; the endometriosis modern pane is better served by ESHRE plus surgery.

## Safety notes for the medical seats

- **Blood moving Chinese formulas and Kampo equivalents** (Salvia miltiorrhiza formulas, Cangfu Daotan, Tokishakuyakusan, Unkei-to) are traditionally contraindicated in pregnancy, and both conditions involve women actively trying to conceive. Cards must carry the practitioner dispensed rule (dosing policy rule 5) and a pregnancy flag.
- **Berberine** should be avoided in pregnancy and breastfeeding (neonatal kernicterus risk) and inhibits CYP3A4, so it can interact with many prescription drugs.
- **Unkei-to contains glycyrrhiza** (licorice root); prolonged use carries pseudoaldosteronism risk (low potassium, raised blood pressure).
- **Cassia cinnamon** in supplement quantities carries coumarin liver toxicity risk.
- **Melatonin** causes drowsiness and interacts with sedatives; long term data in this population are thin.
- **Spearmint** is used precisely for its anti androgen effect; note the theoretical relevance for anyone pregnant.
- **Letrozole, metformin, GnRH agonists, combined oral contraceptives** are prescription or pharmacy medicines: no dose anywhere on a card, route to pharmacist or GP (dosing policy rule 4). Letrozole for ovulation induction is off label in some jurisdictions.
- **Low FODMAP** is a short term elimination protocol, ideally dietitian supervised, not a permanent diet.
- **Vitamin D** has an upper intake limit; study doses stay in the research pane, past tense (dosing policy rule 3).
- Several herbal entries may **interact with hormonal treatment** (combined pills, progestins, GnRH analogues) that many readers with these conditions already take. The advisory band should say so plainly.
