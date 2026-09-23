# Notice to Counsel and the Editor-in-Chief: fabricated content found and removed from the Remedae journal

**From:** the founder, via the build session
**Date:** 23 September 2026
**To:** Counsel (org/departments/counsel.md), Editor-in-Chief (org/roles/growth/editor-in-chief.md)
**Status:** removed and live as of commit `f41e230` on remedae.app

## What was found

Four journal pieces published between April and June 2026, before the integrity rule was enforced in the pipeline, contained invented material presented as fact:

| Piece | Fabricated item |
|---|---|
| Your grandmother was onto something | Quote attributed to "Dr. Aran Patel, gastroenterologist, in a 2024 review" (no such person or review). "A 2024 review in the BMJ of 21 trials" on warm water and post-meal walks (does not exist). Claim that warm water has "strong evidence" for functional dyspepsia. |
| Kampo, in English | Quote attributed to Prof. Kenji Watanabe of Keio (a real academic; the words were not his). "A Cochrane review in 2019" covering hangeshashinto and yokukansan (no such review). |
| The evening you can't rush | "A 2023 study in *Sleep* following 800 adults for eight weeks" (does not exist). |
| Reading the tongue | Quote attributed to "Dr. James Oduor, in an interview for Remedae, 2026" (no such person or interview). Unsupported claims linking geographic tongue to nutrient depletion and midline cracks to anxiety. |

## What was done

Every quote block was deleted. Every invented citation was replaced with either a verifiable statement (148 Kampo formulas on Japanese insurance since 1976; the 1999 *Nature* study on warm feet and sleep onset; NICE recommending CBT-I before hypnotics) or plain framing as tradition rather than evidence. No other journal piece carries a quote. The studio publish endpoint has no published articles to check.

The condition shelf is unaffected: every remedy card is generated from a verified passage with quote-checking, and the audits pass.

## For Counsel

1. These pieces were live for three to five months. Is any disclosure or correction notice advisable, given one quote was put in the mouth of a real, named academic?
2. Should the journal carry a standing note on how pieces are sourced, matching the card-level citation rule?

## For the Editor-in-Chief

1. Please add to the authoring handover (docs/journal-authoring.md): no quotes unless the person said it to us on the record and we hold the transcript; no citation without the PubMed or document URL in the source list; a named reviewer signs off every "on the research" piece before publish.
2. The women's health piece published this week was written under the new rule and is sourced line by line; use it as the reference.

Nothing in this notice has been sent outside the organisation.
