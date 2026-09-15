# Women's health page review, from the seats
15 September 2026 · page: `app/womens-health/page.tsx` (preview, noindex, unlinked) · data checked live against Supabase

## TLDR verdict: not-ready
Four blockers, all fixable in a day. The structure, the live-count honesty and the state-of-play numbers hold up. The blockers: no crisis signpost near postnatal depression, the thrush draft describes oral thrush, "Safe by design" is a safety assurance counsel will not pass, and "Nausea for pregnancy" is broken English on a flagship shelf.

Data verified: all 25 slugs exist. 23 published, 2 draft (mastitis, thrush). State-of-play tiles would render 23 / 140 / 2 and all three numbers are true. Every listed condition, drafts included, has a modern medicine pane, so "each with modern medicine alongside at least one traditional system" is accurate.

## Flags

1. **Modern medicine · blocker.** Postnatal depression sits on the shelf as an ordinary card ("Read every tradition") with no red-flag note. A reader in crisis needs a signpost before a shelf of remedies. Fix: support a per-card red-flag line, e.g. "If you have thoughts of harming yourself or your baby, call 999, or Samaritans on 116 123, free, any time", and confirm the condition page itself carries the same before launch.

2. **Modern medicine · blocker.** The thrush draft's description is oral thrush: "You've got white patches or a thick coating in your mouth". On a women's health shelf this reads as the wrong condition. Fix: pull `thrush` from GROUPS until the page is regenerated for vaginal thrush (or add a `vaginal-thrush` condition), then restore.

3. **Product · blocker.** Published card name "Nausea for pregnancy" is broken English (slug came from a user query). Fix: rename to "Pregnancy nausea" in the DB, keep the slug or alias it.

4. **Counsel · blocker.** Promise card heading "Safe by design". Under CAP, marketers must not state or imply remedies are safe; this is an assurance of safety for the whole shelf. Fix: retitle "Safety on every card". The body copy beneath it is fine and can stay as is.

5. **Traditional medicine · should-fix.** Group lede "what each tradition offers when the cycle is painful, heavy, irregular or driven by hormones" over-promises: PCOS shows 5 systems, endometriosis 5, low libido 2. Fix: "what the traditions with something verified to say offer when..." or drop "each".

6. **Traditional medicine · should-fix.** Meta description says "thirteen traditions" and the hero says "read across every healing system", but no page on this shelf exceeds 9 panes and two show 2. Fix: "across the world's healing systems", no number, no "every".

7. **Modern medicine · should-fix.** Endometriosis, PCOS, mastitis and UTI are conditions where delayed care harms (UTI in pregnancy especially). The only advisory is the panel at the very bottom. Fix: one plain line in the shelf intro: "Some of these need a GP first, and the pages say which."

8. **Counsel · should-fix.** Absolute claims: "every claim cited back to its source", "every one traceable to a quoted source". True only if the audit sweep passes on all 140 cards. Fix: run `npx tsx scripts/audit-dosing.ts` and the citation audit before launch, or soften to "every remedy card cites its source".

9. **Counsel · should-fix.** Launch gate: removing `robots: { index: false }` and linking from nav is the publish act. Before that: flags 1 to 4 closed, imagery licences and model releases on the five photos confirmed, and the researchers CTA kept as is (it is invitation, not claim, and passes).

10. **Product · should-fix.** "Everyday health" is not a coherent women's health group: low mood and bloating are general-population pages not written for this shelf, and low mood half-duplicates postnatal depression one group up. Fix: keep UTI, thrush, pelvic pain, iron deficiency; move low mood and bloating out or retitle the group "Often part of the picture" with a lede that says these affect everyone.

11. **Product · should-fix.** Obvious absences a reader will search for: fibroids, menstrual migraine, breast pain, gestational diabetes. Fix: add to the draft pipeline now so "Gathering" cards can hold the slots honestly.

12. **Product · nice.** The pane badge says "N traditions" but the count includes the modern medicine pane; house rule is modern is alongside, not a tradition. Fix: "N systems" or reuse the conditions-page phrase "N voices".

13. **Product · nice.** The open request (researchers CTA) is a corporate ask on a reader page. It reads well, but it belongs below the AdvisoryPanel or on a /research page linked from here. Also confirm what a draft card links to: "Gathering" cards point at `/conditions/[slug]` and must land somewhere honest, not a thin page.

14. **Growth · should-fix.** SEO when live: title "Women's health · Remedae" carries no search intent. Fix: title "Women's health: remedies from every tradition | Remedae"; description "23 conditions women live with, from period pain to menopause, read across modern medicine and the world's healing traditions, every remedy cited to its source." Add internal links from each listed condition page back to this shelf, or the shelf never accrues authority.

15. **Growth · nice.** The page mostly earns the go-to positioning: 23 live conditions and honest gap language are the moat. The weak tile is "2 more in research now", which undersells. Fix: only show that tile when the number is 5 or more, or fold it into the copy line beneath.

16. **Editorial check, all seats.** No em dashes on the page, no banned words, abundance frame held, modern medicine alongside throughout. The state-of-play paragraph is the best copy on the page. Keep it.

## Sequence to ready
Close 1 to 4, run the audits in 8, then re-run this shelf query and republish the numbers. Everything else can follow the launch.
