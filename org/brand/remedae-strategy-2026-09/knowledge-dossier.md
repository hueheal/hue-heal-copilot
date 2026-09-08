## Business

Remedae is a global health literacy platform. It puts the world's healing traditions on one shelf, modern medicine alongside Ayurveda, TCM, Kampo, Unani, Siddha, Naturopathy, Homeopathy, African, Indigenous, Functional, Lifestyle and Mind-Body, in plain English, with research cited where it exists and honesty where it does not. A library, not a clinic. Live at remedae.app since August 2026 behind a waitlist gate. Founder-led, solo, unfunded as of 8 September 2026.

## Audience

Smallest viable audience: UK adults raised with home remedies, now caring for a child or a parent, searching late at night and distrusting both the feed and the leaflet. Diaspora households first. Readers, not patients. Pilot testers on a six-week programme give weekly feedback by email. Waitlist size and tester count: UNKNOWN.

## Offers and pricing

The library is free to read and stays free. Remedae+ is signposted in the product with a yellow accent and no price; scope, price and date are not set. Modelled at £6.99 a month from month seven after the round closes; Finance recommends testing £8.99 monthly and £59 annual with pilot testers before anything is quoted. Interaction checking has been replaced in the plan by static, attributed interaction notes per remedy. Family profiles are out at launch. API revenue is modelled at £2,500 a month from month 20 only if a design partner signs.

## Current state of play

105 published conditions, 4 drafts (thrush, colic, gum pain, psoriasis), 240 mapped. 786 verified corpus passages across 13 traditions; published pages average six traditions. Search handles 1,073 alias phrasings, filler, typos and semantic matches, with a chooser page; generation runs only when a reader asks. Sprint 1 of the 34-step build sequence is done and Sprint 2 is half done; the nightly worker waits on the database password and repository secrets. Imagery style guide and prompt library are canonical and Higgsfield is connected. No medical advisor, no creators, no research partner, no API pilot. Pre-seed raised: £0.

## Strategy and next 90 days

One outcome this quarter: a reader finds a page, opens more than one tradition, and returns within 30 days. September: correct every claim in the deck, plan and model; instrument return, waitlist and search misses; queue and nightly worker live; invitation waves replace the hard gate; ten most-searched conditions opened to anonymous readers as the first experiment; advisor shortlist; financial model v2 from the real starting position; privacy notice, ICO fee, pilot consent. October: typeahead, honest research page and red-flag interstitial; three Instagram posts a week in the new imagery; advisor named; ten creator conversations; SEIS and EIS advance assurance started. November: ungating decision from the numbers; safety review on the 20 to 30 most-searched conditions; ten founding creators on letters of intent; one research and one API conversation open. Full plan: docs/strategy-2026-09.md in the remedae repository.

## Decisions already made

No em or en dashes anywhere. Modern medicine alongside every tradition, never beneath. No fabrication: verified sources only, from docs/sources.md. Remedae+ surfaces use yellow #fff236, everything else mint. Traditional medicine shown through a modern lens in imagery: real homes, varied families, bright neutral light, no colour tone per image, realism first. NICE CKS is not used (not licensed for commercial reuse). NHS.uk is recommended under four conditions: attribution, link, no paywall on NHS-derived content, no logo or implied endorsement. Aliases approved 7 September 2026. Not being done this quarter: widening beyond 105, light theme, desktop compare, recipes, shopping list, Remedae+ scope, creator lead hire, personalised interaction checking, retail.

## Clients and proof

No paying customers. Pilot testers are the only readers with a feedback loop; consented quotes not yet gathered. No external medical review of any page. Market evidence in the investor pack is sourced and usable as context only, never as a claim about Remedae.

## Team and partners

Founder: Maria Valiji, solo. The Hue & Heal copilot provides department seats (Product, Growth, Finance, Partnerships, Counsel, Experts, Chief of staff). Partners in every class: none. Plausible fits identified for this quarter, with no relationship claimed: a UK clinician with an academic post as advisor; NIMH, British Acupuncture Council and the Ayurvedic Professionals Association as credential registers; GPhC pharmacists and NIMH or CPP herbalists as paid reviewers; a women's health charity or university unit for a scoping review. Advisor terms proposed: advisory equity of 0.25 to 0.5 percent over two years, subject to a solicitor.

## Market

UK first, diaspora first. Alternatives a reader has today: NHS.uk or WebMD without traditions, TikTok without evidence, single-tradition apps, or asking family. Comparables in the deck (Calm, Headspace, Noom, MasterClass, Patreon, Substack) are context, not projection. Market sizing figures live in the investor pack; treat them as sourced background.

## Technical

Next.js 16, React 19, Tailwind v4, Supabase with pgvector, Vercel. Generation pipeline: WHO ICD-11 resolve, PubMed, tradition corpus, Haiku 4.5 extractor with verbatim-quote verification, Opus escalation, description, lifestyle and voice passes, persist. Evidence ingesters for Modern, Lifestyle, paediatric and tradition-specific passages from PubMed with a humans-only filter; pane-level top-ups. Generation costs $0.10 to $0.30 per condition. Studio publish endpoint for journal articles from the copilot. Search: normalise, typo correction, alias table, fuzzy slug, lexical, semantic at 0.55, chooser page.

## Compliance and risks

Educational library, not a medical device; protection rests on pages staying generic. Personalised interaction checking would cross the MHRA software-as-a-medical-device line and is dropped this round. Saves and family profiles are health data under UK GDPR Article 9: explicit consent at first save, DPIA before Remedae+. Waitlist and pilot emails need a privacy notice, lawful basis, unsubscribe and the ICO fee. Creator content is advertising under the CAP Code and the Human Medicines Regulations; a creator agreement, claims standard and credential check are needed before any video. The deck is a financial promotion under FSMA section 21: self-certified investors or an EIS platform, solicitor-drafted wrapper. Entity: confirm Remedae is a clean separate company holding the IP and paying its own bills before SEIS and EIS advance assurance; Anthropic billing currently runs through Hue & Heal. Claims to retire until true: 240+, complete, medically reviewed, remedae.com, interaction checking. Counsel is not a solicitor.

## Links

Product: https://remedae.app. Repository: ~/Claude/remedae. Revised strategy: docs/strategy-2026-09.md; department reviews: review/strategy-2026-09/. Build sequence: docs/action-sequence.md. Sources policy: docs/sources.md. Imagery: org/brand/remedae-imagery.md and remedae-prompt-library.json in the copilot. Higgsfield MCP: https://mcp.higgsfield.ai/mcp. Figma moodboard: https://www.figma.com/design/Z3EfpRcsUWV40K0cpR60ZS/Remedae?node-id=361-2. Source documents: ~/Documents/REMEDAE/Documents (investor deck 4, business plan v3, investor pack, financial plan).

## Open questions

Cash on hand, August spend and personal runway. Waitlist size and tester count. Readers per month and 7 and 30 day return. Raise £500k in one round or a £250k SEIS tranche first. Founder salary from close. Availability and evidence vocabularies for the ingredient layer. Remedae+ signpost: hide or keep as "tell me when". NHS.uk approval. Research route: charity or university. Whether "Your nan was right" stays investor-only. Who the clinical advisor will be.
