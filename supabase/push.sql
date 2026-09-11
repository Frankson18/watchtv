-- ============================================================
-- WatchTV — Push (tokens do aparelho + controle de enviados)
-- Rode no SQL Editor do Supabase (ou via migration).
-- ============================================================

create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  token       text not null,
  platform    text not null check (platform in ('android','ios')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, token)
);
alter table public.push_tokens enable row level security;
drop policy if exists "push owner crud" on public.push_tokens;
create policy "push owner crud" on public.push_tokens
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

-- Histórico do que já foi notificado (evita push repetido). Sem policies:
-- só o service role (Edge Function) acessa.
create table if not exists public.sent_notifications (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null,
  kind      text not null,   -- 'tv' | 'movie'
  ref       text not null,   -- ex: 's2e5' | 'release'
  sent_at   timestamptz not null default now(),
  unique (user_id, kind, ref)
);
alter table public.sent_notifications enable row level security;
create index if not exists sent_notifications_user_idx on public.sent_notifications (user_id);
