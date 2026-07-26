-- Migración incremental: agrega sitio web y redes sociales a commercial_partners

alter table public.commercial_partners
  add column website_url text,
  add column social_media_urls jsonb default '[]'::jsonb;

create index commercial_partners_website_url_idx on public.commercial_partners (website_url);
