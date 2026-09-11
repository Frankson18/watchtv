-- ============================================================
-- WatchTV — Avaliações (séries, filmes e episódios)
-- Rode no SQL Editor do Supabase.
-- season/episode = 0 significa avaliação do título inteiro.
-- ============================================================

create table if not exists public.ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  tmdb_id     bigint not null,
  media_type  text not null check (media_type in ('tv','movie')),
  season      int not null default 0,
  episode     int not null default 0,
  rating      numeric(2,1) not null check (rating >= 0.5 and rating <= 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type, season, episode)
);

create index if not exists ratings_title_idx on public.ratings (user_id, tmdb_id, media_type);

alter table public.ratings enable row level security;

drop policy if exists "ratings owner crud" on public.ratings;
create policy "ratings owner crud" on public.ratings
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- trigger updated_at (reutiliza a função criada na schema.sql)
drop trigger if exists ratings_touch on public.ratings;
create trigger ratings_touch before update on public.ratings
  for each row execute function public.touch_updated_at();
