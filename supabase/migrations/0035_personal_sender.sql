-- A workspace can send as a person as well as the brand. The personal
-- sender is the founder's own name and alias on the brand's domain,
-- e.g. "Maria <maria@remedae.app>"; the newsletter composer offers it as
-- "Send as" once set.
alter table public.brand_profiles add column if not exists sender_personal text not null default '';
