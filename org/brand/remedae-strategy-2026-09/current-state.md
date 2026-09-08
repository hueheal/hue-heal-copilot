# Remedae, current state of play (8 September 2026)

Facts from the production database and the repository, for the department review of the July 2026 documents.

- Live at remedae.app on Vercel, behind a waitlist gate for anonymous visitors; signed-in readers and pilot testers see the full shelf. The business plan's "launch August 2026 at remedae.com" is therefore partly true: the product is live but gated, and the domain is remedae.app.
- Shelf: 105 published conditions (the plan says "240+"; that figure counted planned and draft topics), 4 drafts, 6 archived duplicates. 786 verified corpus passages across 13 traditions (the plan says 173). Published pages average six traditions.
- Search: alias table (1,073 phrasings), filler stripping, typo correction, semantic match, and a chooser page; a fresh generation now runs only when a reader asks for it. Historic failure rate of live generation was 40%.
- Ingestion: Modern, Lifestyle, paediatric and tradition-specific evidence ingesters from PubMed; pane-level top-ups; nightly worker and job queue not yet built (needs database password and repository secrets).
- Plan of record: a 34-step, six-sprint sequence in docs/action-sequence.md. Sprint 1 done (type and contrast floors, cached reads, aliases, categories). Sprint 2 half done (ingesters and top-ups shipped; queue and worker pending; ingredient layer not started).
- Imagery: a style guide (traditional medicine through a modern lens, realism first, one subject one action) and a prompt library are canonical in the repo and copied into the copilot; Higgsfield is connected; first test image pending.
- Pilot programme: testers on a six-week programme with weekly tasks and feedback by email, crons live. Tester count and waitlist size: not known to this review.
- Remedae+: signposted in the UI (yellow accent), no price, no scope beyond the plan's "creator video library, saved remedies and protocols, interaction checking, family profiles". No creators recruited. No API pilot. No medical advisor named.
- Spend: generation costs roughly $0.10 to $0.30 per condition; Anthropic billing on the Hue & Heal account; one billing lapse halted generation once.
- Known gaps from research this week: no ingredient entity (1,000 ingredient lines, 72% carrying a native or Latin name, 28% with an availability badge); the condition page stacks 5 to 10 tradition accordions with disclosure depth 3 to 4; no typeahead; no "today" surface; contrast and type floors fixed on 3 September.
- Sources: PubMed, WHO ICD-11, curated corpus. NICE CKS is not licensed for commercial reuse and is not scraped. NHS.uk (Open Government Licence) recommended by the expert seat with conditions: attribution, link, no paywall on NHS-derived content, no logo or implied endorsement.
