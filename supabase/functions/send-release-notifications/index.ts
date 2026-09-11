// Edge Function: send-release-notifications
// Roda via cron (pg_cron) 1x por dia. Consulta a biblioteca de cada usuário,
// verifica no TMDB o que estreia "hoje" e envia push pela Expo Push API.
//
// Secrets necessários (Supabase → Edge Functions → Secrets):
//   TMDB_API_KEY = <sua chave do TMDB>
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.

import { createClient } from "jsr:@supabase/supabase-js@2";

const TMDB_KEY = Deno.env.get("TMDB_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdb(path: string): Promise<any> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", "pt-BR");
  const headers: Record<string, string> = {};
  if (TMDB_KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${TMDB_KEY}`;
  else url.searchParams.set("api_key", TMDB_KEY);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

/** Data de "hoje" no fuso de Brasília (YYYY-MM-DD). */
function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

Deno.serve(async () => {
  if (!TMDB_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "faltam variáveis (TMDB_API_KEY?)" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const today = todayInSaoPaulo();

  const [{ data: lib }, { data: tokens }] = await Promise.all([
    supabase.from("library").select("*").neq("status", "dropped"),
    supabase.from("push_tokens").select("user_id, token"),
  ]);

  const byUser = new Map<string, string[]>();
  for (const t of tokens ?? []) {
    const arr = byUser.get(t.user_id) ?? [];
    arr.push(t.token);
    byUser.set(t.user_id, arr);
  }

  const messages: Record<string, unknown>[] = [];

  for (const item of lib ?? []) {
    const userTokens = byUser.get(item.user_id) ?? [];
    if (userTokens.length === 0) continue;
    try {
      if (item.media_type === "tv") {
        const tv = await tmdb(`/tv/${item.tmdb_id}`);
        const next = tv?.next_episode_to_air;
        if (!next?.air_date || next.air_date !== today) continue;
        const ref = `s${next.season_number}e${next.episode_number}`;
        const ins = await supabase
          .from("sent_notifications")
          .insert({ user_id: item.user_id, kind: "tv", ref });
        if (ins.error) continue; // já enviado antes
        const code = `T${String(next.season_number).padStart(2, "0")}E${String(next.episode_number).padStart(2, "0")}`;
        for (const token of userTokens) {
          messages.push({
            to: token,
            sound: "default",
            title: `Novo episódio de ${item.title}`,
            body: `${code}${next.name ? ` · ${next.name}` : ""} já está disponível.`,
            data: { tmdb_id: item.tmdb_id },
          });
        }
      } else {
        if (item.status === "completed") continue;
        if (!item.release_date || item.release_date !== today) continue;
        const ins = await supabase
          .from("sent_notifications")
          .insert({ user_id: item.user_id, kind: "movie", ref: "release" });
        if (ins.error) continue;
        for (const token of userTokens) {
          messages.push({
            to: token,
            sound: "default",
            title: `${item.title} estreia hoje`,
            body: "Seu filme da lista chegou aos cinemas.",
            data: { tmdb_id: item.tmdb_id },
          });
        }
      }
    } catch {
      // ignora item com erro e segue
    }
  }

  for (let i = 0; i < messages.length; i += 100) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }

  return new Response(JSON.stringify({ date: today, sent: messages.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
