-- ============================================================
-- WatchTV — Agenda diária do push (pg_cron + pg_net)
-- Rode no SQL Editor do Supabase.
-- Troque SEU_SERVICE_ROLE_KEY pela service_role do projeto
-- (Supabase → Project Settings → API → service_role).
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove agendamento antigo (se existir) e recria
select cron.unschedule('send-release-notifications')
where exists (select 1 from cron.job where jobname = 'send-release-notifications');

-- Todo dia às 12:00 UTC (= 09:00 no horário de Brasília)
select cron.schedule(
  'send-release-notifications',
  '0 12 * * *',
  $$
  select net.http_post(
    url := 'https://icrninwlumrfneambdlf.supabase.co/functions/v1/send-release-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SEU_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
