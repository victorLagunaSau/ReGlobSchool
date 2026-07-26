-- Migración incremental: agrega sitio web y redes sociales a distributions

alter table public.distributions
  add column website_url text,
  add column social_media_urls jsonb default '[]'::jsonb;

create index distributions_website_url_idx on public.distributions (website_url);
