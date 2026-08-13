-- ============================================================================
-- Hue & Heal :: 0019 — Remedae workspace identity + per-brand email sender
-- 1. brand_profiles gains sender_email / tagline / website (used by the
--    newsletter footer and the Resend "from" address per brand world).
-- 2. Seeds the Remedae brand world with its real identity: mint accent,
--    Quando display serif, and a voice distilled from the Remedae copy bible.
-- Safe to re-run. Run in the Supabase SQL editor.
-- ============================================================================

alter table public.brand_profiles add column if not exists sender_email text not null default '';
alter table public.brand_profiles add column if not exists tagline      text not null default '';
alter table public.brand_profiles add column if not exists website      text not null default '';

update public.brand_profiles set
  accent_color = '#A6D893',
  display_font = 'quando',
  sender_email = 'Remedae <news@remedae.app>',
  tagline      = $tg$The world's healing knowledge. Now yours.$tg$,
  website      = 'remedae.app',
  tone_of_voice = $tv$Plain, warm and precise. Remedae writes like a knowledgeable friend reading the world's healing library aloud: clear sentences, no jargon, no hype. Every tradition is held in equal standing, modern medicine alongside the rest, never above or below. The frame is abundance, not debate: all the remedies, from every tradition, side by side and clearly explained. Evidence is always specific: name the study, the body or the year, and if the evidence is thin, say so plainly. Avoid three registers completely: clinical ("patients", "presents with"), woo ("energies", "chakras"), and hustle ("biohack", "optimise"). British English. No em dashes, ever: use a comma, colon or full stop.$tv$,
  writing_guidelines = $wg$Banned words: delve, navigate, unlock, leverage, harness, biohack, optimise, journey, ancient wisdom, holistic, natural, clean, proven, magic, miracle, tapestry, realm, elevate, unleash, secret, timeless. Never use "research shows" or "clinically proven" as standalone claims: say which research, which year, and what it found; if unknown, say so. Never originate remedies, dosages, citations or study findings: only restate verified content. Signature phrases to use on purpose: "All the remedies, from every tradition." "Six traditions, one body." "Sleep. Sun. Breath." "The world's healing knowledge. Now yours." Keep paragraphs short, one idea each. Headlines in the Quando serif, with the accent half of a heading set in italic mint. Sign off calm and specific, never urgent.$wg$
where name ilike 'remedae';
