# Product department revision, 8 September 2026

Head of Product, with the Designer and Researcher seats.

## What still holds

- A library, not a clinic. Free to read, advisory language on every page.
- Thirteen traditions side by side with an evidence grade is the product. Published pages average six traditions (known).
- Phase order: library first, nothing monetised until people return.
- The sequence's ordering rule (unblock before widen, data before surface) holds. Sprints 1 and 2 proved it: misses now land on a chooser instead of a 40% failing generation.

## What is now wrong or stale

- "Product complete" and "240+ conditions" are not true. 105 published (known). Deck, plan and model all carry 240.
- "Public launch August at remedae.com" is a gated beta at remedae.app (known). Readership, retention and waitlist, the only Phase 1 measures the plan names, are not reported (missing).
- The model's first input, 5,000 readers growing 15% a month, is assumed, not observed. Every downstream number inherits it.
- Remedae+ in February 2027 is a date with no scope, price, creators or evidence of demand. Product cannot support it.
- Medical review budgeted for 240 conditions at £150 (assumed). The shelf is 105 and no reviewer is named.
- The page stacks 5 to 10 accordions at disclosure depth 3 to 4 (known). Readers see about one tradition per visit (assumed). The deck's "side by side" is not what the page does yet.
- No ingredient entity: 1,000 lines, 28% with an availability badge (known).

## Revised product strategy

One outcome this quarter: a reader arriving with a condition finds a page, opens more than one tradition, and returns within 30 days. Three bets, ranked.

1. Search never dead-ends. Finish the queue and worker (step 9), pull typeahead (step 29) forward, ship the honest research page (step 22). Smallest version: typeahead over published names and the 1,073 aliases; a miss enqueues and shows the nearest shelf page. Worked if misses reaching a generation fall below 10% and no request is held.
2. The page shows the comparison. Ingredient layer (step 12) for the top 60 ingredients only, then switcher and flattened card (steps 16, 17). Smallest version: normalised-name match with a badge, no photos, no ingredient sheet. Worked if disclosure depth is two and traditions viewed per visit rises from about one towards three.
3. Return is measured before it is designed. Instrument 7 and 30 day return for signed-in readers now. Smallest "today" surface: one weekly email of a saved condition on the existing pilot crons. Worked if we hold a real 30 day figure by November and the email lifts it.

Not being done this quarter: widening to 300 conditions, light theme, desktop compare table, canonical recipes, make mode, shopping list, ingredient pages, tradition ingesters. Not being specified: Remedae+, interaction checking, family profiles, creator tooling, API pilot. All wait on a return figure.

## Next 90 days

- September: secrets handed over, nightly worker runs with the laptop closed, nightly report lands. Retention instrumented. Ingredient migration, top 60 matched. Researcher counts testers and waitlist and runs eight 30 minute interviews with pilot testers on the last time they looked something up and what they did next. Designer prototypes switcher and card in code for sign-off.
- October: Sprint 3 built. Typeahead, honest research page and red-flag interstitial live. First weekly email.
- November: ungating decision from the numbers. ICD codes on corpus rows and the staging queue (steps 19, 23). Medical review starts on the 20 most searched conditions, not 240.

## Decisions for the founder

1. Database password and repository secrets. Step 9 has waited a fortnight; bet 1 sits behind it.
2. Availability vocabulary (Supermarket, Asian grocer, Pharmacy, Online, Practitioner) and evidence words (Strong, Good, Emerging, Traditional, Practitioner-led). Both block Sprint 3.
3. Ungate at 105 once misses are under 10% and the interstitial is live, or hold for 240. Product recommends ungating; 240 came from a draft count, not a reader need.
4. Retire "complete" and "240+" from every document today.
5. Keep Remedae+ as a signpost with a "tell me when" click, counted as demand, and nothing more until return is known.
6. A named medical reviewer for the staging queue, not only the deck. Without one, step 23 cannot ship.

## Numbers

| Figure | Value | Status |
|---|---|---|
| Conditions published | 105 | known |
| Corpus passages, traditions | 786, 13 | known |
| Traditions per published page | 6 average | known |
| Alias phrasings | 1,073 | known |
| Historic live generation failure | 40% | known |
| Ingredient lines, with badge | 1,000, 28% | known |
| Disclosure depth on card | 3 to 4 | known |
| Generation cost per condition | $0.10 to $0.30 | known |
| Traditions viewed per visit | about 1 | assumed |
| Pilot testers, waitlist size | | missing |
| Readers per month, 7 and 30 day return | | missing |
| Search miss rate | | missing, logged since Sprint 1, not reported |
| Readers at launch, monthly growth | 5,000, 15% | assumed, model input |
| Remedae+ price, conversion, churn | £6.99, 0.8%, 6% | assumed, unvalidated |
| Medical review per condition | £150 | assumed |
