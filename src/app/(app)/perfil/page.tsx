"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { createClient } from "@/lib/supabase-client";
import {
  getStats,
  getRecentActivity,
  getContributionData,
  formatDuration,
  type Stats,
  type RecentActivity,
  type ContributionDay,
} from "@/lib/stats";
import ContributionGraph from "@/components/contribution-graph";
import Poster from "@/components/poster";
import { Tv, Film, Sparkles, Play, LogOut } from "lucide-react";

function relTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months > 1 ? "es" : ""}`;
}

export default function PerfilPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentActivity[]>([]);
  const [contrib, setContrib] = useState<ContributionDay[]>([]);
  const year = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    (async () => {
      const [s, r, c] = await Promise.all([
        getStats(),
        getRecentActivity(5),
        getContributionData(year),
      ]);
      if (!active) return;
      setStats(s);
      setRecent(r);
      setContrib(c);
    })();
    return () => {
      active = false;
    };
  }, [year]);

  const email = user?.email ?? "—";
  const name = email.split("@")[0];
  const initial = name.charAt(0).toUpperCase();
  const createdAt = user?.created_at ? new Date(user.created_at) : null;

  return (
    <div className="flex flex-col gap-5 px-4 pt-3 pb-6 flex-1 overflow-y-auto">
      <header className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-text-primary text-xl font-black shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{name}</h1>
          <p className="text-xs text-text-secondary truncate">{email}</p>
          {createdAt && (
            <p className="text-[11px] text-text-tertiary mt-0.5">
              Membro desde {createdAt.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2">
        <StatCard
          label="Séries"
          value={stats?.showsWatching ?? 0}
          icon={Tv}
          sub="assistindo"
        />
        <StatCard
          label="Animes"
          value={stats?.animesWatching ?? 0}
          icon={Sparkles}
          sub="assistindo"
        />
        <StatCard
          label="Filmes"
          value={stats?.moviesWatched ?? 0}
          icon={Film}
          sub="vistos"
        />
        <StatCard
          label="Episódios"
          value={stats?.episodesTotal ?? 0}
          icon={Play}
          sub="totais"
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold text-text-tertiary">TEMPO ASSISTIDO</h2>
        <DurationRow label="Séries" value={formatDuration(stats?.durationTvMinutes ?? 0)} />
        <DurationRow label="Animes" value={formatDuration(stats?.durationTvMinutes ?? 0)} />
        <DurationRow label="Filmes" value={formatDuration(stats?.durationMoviesMinutes ?? 0)} />
      </section>

      {stats && stats.topGenres.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[13px] font-semibold text-text-tertiary">GÊNEROS MAIS VISTOS</h2>
          <div className="flex gap-2 flex-wrap">
            {stats.topGenres.map((g) => (
              <span key={g} className="px-3.5 py-1.5 rounded-full bg-bg-elev border border-border text-xs font-medium text-text-secondary">
                {g}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-semibold text-text-tertiary">ÚLTIMOS VISTOS</h2>
        {recent.length === 0 ? (
          <p className="text-text-secondary text-sm py-6 text-center">Nada visto ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-2 bg-bg-elev rounded-lg">
                <div className="w-[40px] h-[60px] shrink-0">
                  <Poster path={r.poster_path} alt={r.title} size="w92" className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{r.title}</h3>
                  <p className="text-xs text-text-secondary">
                    {r.media_type === "movie"
                      ? "Filme"
                      : `T${r.season} • E${r.episode}${r.watch_count > 1 ? ` ×${r.watch_count}` : ""}`}
                  </p>
                </div>
                <span className="text-[11px] text-text-tertiary shrink-0">
                  {relTime(r.watched_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-semibold text-text-tertiary">ATIVIDADE</h2>
        <ContributionGraph days={contrib} year={year} />
      </section>

      <SignOutButton />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: number;
  icon: typeof Tv;
  sub: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-elev border border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-tertiary">{label}</span>
        <Icon className="w-4 h-4 text-accent" />
      </div>
      <span className="text-2xl font-bold leading-tight">{value}</span>
      <span className="text-[11px] text-text-tertiary">{sub}</span>
    </div>
  );
}

function DurationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className="text-[15px] font-bold">{value}</span>
    </div>
  );
}

function SignOutButton() {
  const sb = createClient();
  return (
    <button
      onClick={async () => {
        await sb?.auth.signOut();
        window.location.href = "/login";
      }}
      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-bg-elev border border-border text-text-secondary text-sm font-medium active:scale-95"
    >
      <LogOut className="w-4 h-4" />
      Sair
    </button>
  );
}