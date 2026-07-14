-- ============================================================
-- WatchTV — Reset completo do schema (use no SQL Editor Supabase)
-- Roda isto de topo a baixo. Limpa e recria tudo. Dados demo serão perdidos.
-- ============================================================

-- 1. Dropa tudo (evita configs parciais/antigas causarem conflito)
drop table if exists public.watched_episodes cascade;
drop table if exists public.library cascade;
drop function if exists public.touch_updated_at() cascade;

-- 2. Cria library
create table public.library (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid(),
  tmdb_id         bigint not null,
  media_type      text not null check (media_type in ('tv','movie')),
  status          text not null default 'watching'
                  check (status in ('watching','planned','completed','dropped')),
  title           text not null,
  poster_path     text,
  backdrop_path   text,
  release_date    date,
  runtime_minutes int,
  current_season  int  not null default 1,
  current_episode int  not null default 0,
  total_seasons   int,
  last_season_air_date timestamptz,
  last_watched_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type)
);

-- 3. Cria watched_episodes
create table public.watched_episodes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid(),
  library_id      uuid not null references public.library(id) on delete cascade,
  season          int  not null,
  episode         int  not null,
  runtime_minutes int,
  watch_count     int  not null default 1,
  watched_at      timestamptz not null default now(),
  unique (library_id, season, episode)
);

-- 4. Índices
create index library_user_status_idx   on public.library (user_id, status);
create index library_user_recent_idx   on public.library (user_id, last_watched_at desc nulls last);
create index watched_lib_idx           on public.watched_episodes (library_id, season, episode);

-- 5. Trigger updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger library_touch before update on public.library
  for each row execute function public.touch_updated_at();

-- 6. RLS
alter table public.library          enable row level security;
alter table public.watched_episodes enable row level security;

create policy "library owner crud" on public.library
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "watched owner crud" on public.watched_episodes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 6.1 Migration para schemas antigos (idempotente — adicionar runtime_minutes)
alter table public.library
  add column if not exists runtime_minutes int;
alter table public.watched_episodes
  add column if not exists runtime_minutes int;
alter table public.watched_episodes
  add column if not exists watch_count int;
alter table public.watched_episodes
  alter column watch_count set default 1;
update public.watched_episodes set watch_count = 1 where watch_count is null;

-- 7. DIAGNÓSTICO — roda e me manda o output
select 'tables' as group, 'library'           as name, count(*) as exists_check from information_schema.tables where table_schema='public' and table_name='library'
union all
select 'tables', 'watched_episodes', count(*) from information_schema.tables where table_schema='public' and table_name='watched_episodes'
union all
select 'policies', 'library owner crud', count(*) from pg_policies where schemaname='public' and tablename='library' and policyname='library owner crud'
union all
select 'policies', 'watched owner crud', count(*) from pg_policies where schemaname='public' and tablename='watched_episodes' and policyname='watched owner crud'
union all
select 'rls',     'library enabled',     count(*) from pg_tables where schemaname='public' and tablename='library' and rowsecurity = true
union all
select 'rls',     'watched enabled',     count(*) from pg_tables where schemaname='public' and tablename='watched_episodes' and rowsecurity = true;