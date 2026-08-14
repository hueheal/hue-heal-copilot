-- ============================================================================
-- Hue & Heal :: 0020 — restore the Remedae brand world
-- Handles both failure cases from the original 0007 seed:
--   a) the Remedae row was never created (or was deleted), and/or
--   b) it exists but you have no membership row, so RLS hides it from you.
-- Creates the world if missing, applies the full Remedae identity (same as
-- 0019), and copies every Hue & Heal membership onto Remedae so whoever can
-- see the parent world can see Remedae too.
-- Safe to re-run. Run in the COPILOT project (dxniwcwoacyrjlyhymoh).
-- ============================================================================

do $$
declare
  hh_id  uuid;
  rem_id uuid;
  who    uuid;
begin
  select id into hh_id from public.brand_profiles where name ilike 'hue & heal' limit 1;
  select id into rem_id from public.brand_profiles where name ilike 'remedae' limit 1;

  -- Prefer the parent world's creator; fall back to the first real user.
  select coalesce(
    (select created_by from public.brand_profiles where id = hh_id),
    (select id from auth.users order by created_at limit 1)
  ) into who;

  if rem_id is null then
    insert into public.brand_profiles (name, display_font, accent_color, created_by, owner)
    values ('Remedae', 'quando', '#A6D893', who, who)
    returning id into rem_id;
  end if;

  -- Everyone who belongs to Hue & Heal belongs to Remedae too.
  if hh_id is not null then
    insert into public.brand_members (brand_id, user_id, email, role)
    select rem_id, bm.user_id, bm.email, bm.role
    from public.brand_members bm
    where bm.brand_id = hh_id
    on conflict (brand_id, email) do nothing;
  end if;
end $$;

-- Full Remedae identity (same content as 0019; harmless to re-apply).
update public.brand_profiles set
  accent_color = '#A6D893',
  display_font = 'quando',
  sender_email = 'Remedae <news@remedae.app>',
  tagline      = $tg$The world's healing knowledge. Now yours.$tg$,
  website      = 'remedae.app',
  tone_of_voice = $tv$Plain, warm and precise. Remedae writes like a knowledgeable friend reading the world's healing library aloud: clear sentences, no jargon, no hype. Every tradition is held in equal standing, modern medicine alongside the rest, never above or below. The frame is abundance, not debate: all the remedies, from every tradition, side by side and clearly explained. Evidence is always specific: name the study, the body or the year, and if the evidence is thin, say so plainly. Avoid three registers completely: clinical ("patients", "presents with"), woo ("energies", "chakras"), and hustle ("biohack", "optimise"). British English. No em dashes, ever: use a comma, colon or full stop.$tv$,
  writing_guidelines = $wg$Banned words: delve, navigate, unlock, leverage, harness, biohack, optimise, journey, ancient wisdom, holistic, natural, clean, proven, magic, miracle, tapestry, realm, elevate, unleash, secret, timeless. Never use "research shows" or "clinically proven" as standalone claims: say which research, which year, and what it found; if unknown, say so. Never originate remedies, dosages, citations or study findings: only restate verified content. Signature phrases to use on purpose: "All the remedies, from every tradition." "Six traditions, one body." "Sleep. Sun. Breath." "The world's healing knowledge. Now yours." Keep paragraphs short, one idea each. Headlines in the Quando serif, with the accent half of a heading set in italic mint. Sign off calm and specific, never urgent.$wg$
where name ilike 'remedae';

-- Confirm: expect one row, mint accent, quando font, and your email listed.
select p.name, p.accent_color, p.display_font, m.email, m.role
from public.brand_profiles p
left join public.brand_members m on m.brand_id = p.id
where p.name ilike 'remedae';
