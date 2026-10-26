-- ============================================================================
-- Hue & Heal :: 0046 — key links on each workspace's home
-- The home of each workspace opens on its insights and a few cards to the
-- places the founder uses most (the product's admin, its document library,
-- its website, its Figma templates). They live on the brand and can be
-- edited from the home page.
-- links: [{ label, sub, url }]
-- ============================================================================
alter table public.brand_profiles add column if not exists home_links jsonb;

update public.brand_profiles set home_links = '[
  {"label":"Admin insights","sub":"Families, applications, plans and feedback","url":"https://mossislandgame.com/admin?tab=insights"},
  {"label":"Document library","sub":"The admin Library","url":"https://mossislandgame.com/admin?tab=library"},
  {"label":"Website","sub":"mossislandgame.com","url":"https://mossislandgame.com"},
  {"label":"Founding Family applications","sub":"Review and approve","url":"https://mossislandgame.com/admin?tab=applications"},
  {"label":"Social templates","sub":"Moss Island Social Templates in Figma","url":"https://www.figma.com/design/zRPzlRUISFVMvw7KZXkjws"}
]'::jsonb where name = 'Moss Island' and home_links is null;

update public.brand_profiles set home_links = '[
  {"label":"Website","sub":"hueandheal.netlify.app, moving to hueandheal.com","url":"https://hueandheal.netlify.app"},
  {"label":"Site admin","sub":"The website''s own admin","url":"https://hueandheal.netlify.app/admin"},
  {"label":"Journal","sub":"Every published piece","url":"https://hueandheal.netlify.app/journal"},
  {"label":"Social templates","sub":"Hue & Heal Social Templates in Figma","url":"https://www.figma.com/design/ZpkB5lZiwW3p8ByicUcFiG"},
  {"label":"Opportunity radar","sub":"Leads, tenders and funding","url":"/v2/radar"},
  {"label":"Deploys","sub":"Netlify","url":"https://app.netlify.com/sites/hueandheal/deploys"}
]'::jsonb where name = 'Hue & Heal' and home_links is null;

update public.brand_profiles set home_links = '[
  {"label":"Admin","sub":"The Remedae admin","url":"https://remedae.app/admin"},
  {"label":"Analytics","sub":"Remedae admin analytics","url":"https://remedae.app/admin/analytics"},
  {"label":"Website","sub":"remedae.app","url":"https://remedae.app"},
  {"label":"Journal","sub":"remedae.app/journal","url":"https://remedae.app/journal"}
]'::jsonb where name = 'Remedae' and home_links is null;
