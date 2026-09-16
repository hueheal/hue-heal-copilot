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

## Second pass, full text

Chief scientific officer seat, 16 September 2026. Companion file: `entries-fulltext.json` in this folder, 10 passages. The first pass confirmed benefit at abstract level but the extractor often had no concrete remedy to build a card from: no formula name, no composition, no description of how the remedy is used. This pass fills that gap with verbatim full-text passages fetched this session from PMC open access XML (NCBI efetch), each carrying the remedy's name, its make-up where the source gives one, and how it was administered, plus enough findings text to support claims. All 10 source URLs (pmc.ncbi.nlm.nih.gov article pages) returned 200 this session. Passages contain study doses; the pipeline gates instructions as usual.

**TCM (3 passages).**
- Salvia miltiorrhiza containing CHM plus GnRH agonist (Gao Q, Front Pharmacol 2022, PMC8889030): full-text background names Salvia miltiorrhiza's Chinese Pharmacopoeia listing and the Gui Zhi Fu Ling Wan combination (Gynoclear), the intervention section describes CHM as capsules, tablets, pills and decoctions alongside GnRH-a, and the results carry recurrence (RR 0.26), pregnancy (RR 1.96) and CA-125 numbers.
- Shaofu Zhuyu Decoction (Kim SB, Pharmaceuticals 2025, PMC12472636): names the Qing dynasty source text (Yilin Gaicuo, 1830), lists the constituent herbs used across all 11 trials (Angelicae Gigantis Radix, Cinnamomi Cortex, Cnidii Rhizoma, Corydalis Tuber, Foeniculi Fructus, Trogopterori Faeces, Typhae Pollen, Zingiberis Rhizoma, plus Paeoniae Radix Rubra and Myrrha in most), and reports pooled total effective rate and VAS results with the honest caveat that trial quality is moderate to low and all trials are Chinese.
- Nei Yi Wan, named at last: the Japan Society of Obstetrics and Gynaecology clinical practice guideline for endometriosis, 3rd edition (Harada T, J Obstet Gynaecol Res 2022, PMC10087749) summarises the Cochrane Nei Yi Wan findings by name (equal to gestrinone, better analgesia than danazol) and the Xuefu Zhuyu and Wenjing-tang meta-analyses. The 2012 Cochrane full review text itself is not open access (PMC12817023 carries the abstract only, and cochranelibrary.com refused the fetch), so the guideline passage carries the formula name instead. Honest note: no open access source found this session gives Nei Yi Wan's composition; the card can name the formula and its trial results but not its herbs.

**Kampo (2 passages).**
- The same Japan guideline's symptomatic treatment section names four Kampo formulas used for endometriosis-associated dysmenorrhea with their plain-language identities: shakuyakukanzoto (peony and licorice decoction), tokishakuyakusan (angelica and peony powder), keishibukuryogan (cassia twig and tuckahoe pill) and tokakujokito (peach kernel purgative decoction). Guideline-grade naming, exactly what the extractor lacked.
- Tokishakuyakusan composition and indication (Yoshino T, Evid Based Complement Alternat Med 2016, PMC4783569): full text states the six crude components (Japanese Angelica root, peony root, hoelen, Atractylodes rhizome, Alisma rhizome, Cnidium rhizome), the Japanese national health insurance indication for dysmenorrhea, and the traditional pattern it is prescribed for. Indication terms are period pain and dysmenorrhea only; this study is not endometriosis-specific, the endometriosis link stays with the first-pass Taniguchi 2020 entry.

**Naturopathy (4 passages).**
- Porpora 2013 observational cohort (PMC3662115): the exact NAC regimen (600 mg three times a day, three consecutive days a week, for 3 months, with the four-day washout rationale) and the headline outcome (24 treated women cancelled scheduled laparoscopy versus 1 control).
- Anastasi 2023 single-cohort study (PMC10048621): same intermittent regimen in the methods, with VAS, endometrioma size, CA-125 and NSAID-use results.
- Watrowski 2026 systematic review (Antioxidants, PMC13405467): the honesty anchor. Positive pain findings come from non-randomised or uncontrolled designs; the only randomised postoperative trial showed no additive analgesic effect; tolerability of the intermittent 1800 mg/day regimen was good.
- Melatonin RCT (Söderman 2023, PLoS One, PMC10237656): intervention section (20 mg at bedtime for two cycles) and the negative conclusion, alongside the trial's own statement that a previous study found 10 mg daily reduced endometriosis-associated pelvic pain. Mixed evidence, stated plainly.

**Functional (1 passage).**
- EndoFOD (Varney 2025, Aliment Pharmacol Ther, PMC12107219): the full description of what the low FODMAP diet involved (high-FODMAP foods swapped for nutritionally equivalent alternatives to under 5 g FODMAPs per day, dietitian-supported, 28 days, meals supplied) plus responder results (60% versus 26%, p = 0.008).

**Skipped again, and why.** Unani: one 2025 narrative review on phytoestrogens in gynecological disorders (Altern Ther Health Med) is the only PubMed hit touching endometriosis; not a credible remedy source. Siddha: the PubMed and PMC hits are Ayurvedic reviews, toxicity studies and ethnobotany, nothing endometriosis-specific with a named remedy. Both left out, same call as the first pass. The Cochrane 2012 full text and the Taniguchi Tokishakuyakusan 2020 full text (Wiley, paywalled) could not be fetched; nothing was entered from either beyond what open sources carry.
