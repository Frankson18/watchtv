"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import TrackCard from "@/components/track-card";
import { listWatching } from "@/lib/library";
import type { LibraryItem } from "@/lib/types";

const fetcher = () => listWatching();

export default function AssistindoPage() {
  const { data: items, isLoading } = useSWR<LibraryItem[]>("watching", fetcher);
  const [filter, setFilter] = useState<"all" | "tv" | "anime">("all");
  const [epCounts, setEpCounts] = useState<Record<string, { total: number; watched: number }>>({});

  useEffect(() => {
    if (!items) return;
    let active = true;
    (async () => {
      const counts: Record<string, { total: number; watched: number }> = {};
      for (const it of items) {
        try {
          const r = await fetch(`/api/tmdb/tv/${it.tmdb_id}`);
          if (!r.ok) continue;
          const tv = await r.json();
          const season =
            tv.seasons?.find((s: { season_number: number }) =>
              s.season_number === it.current_season,
            ) ?? null;
          const total = season?.episode_count ?? 0;
          counts[it.id] = { total, watched: it.current_episode };
        } catch {
          /* ignore */
        }
      }
      if (active) setEpCounts(counts);
    })();
    return () => {
      active = false;
    };
  }, [items]);

  const filtered = items ?? [];

  return (
    <div className="flex flex-col gap-5 px-4 pt-3 pb-6 flex-1 overflow-y-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-tight">Assistindo agora</h1>
        <p className="text-[13px] text-text-secondary">Ordenado pelo mais recente</p>
      </header>

      <div className="flex gap-2">
        {([
          ["all", "Tudo"],
          ["tv", "Séries"],
          ["anime", "Animes"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === k
                ? "bg-accent border-accent text-text-primary"
                : "bg-bg-elev border-border text-text-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[112px] rounded-xl bg-bg-elev animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nada em andamento"
          subtitle="Busque e adicione uma série ou anime para começar."
          ctaHref="/buscar"
          ctaLabel="Buscar títulos"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((it) => (
            <TrackCard
              key={it.id}
              item={it}
              totalEps={epCounts[it.id]?.total}
              watchedCount={epCounts[it.id]?.watched}
              onUpdated={() => mutate("watching")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  subtitle,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  subtitle: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-text-secondary max-w-[260px]">{subtitle}</p>
      <a
        href={ctaHref}
        className="mt-3 px-4 py-2 rounded-xl bg-accent text-text-primary text-sm font-semibold"
      >
        {ctaLabel}
      </a>
    </div>
  );
}