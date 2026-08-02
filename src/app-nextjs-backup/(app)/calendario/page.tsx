"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { listLibrary } from "@/lib/library";
import type { LibraryItem } from "@/lib/types";
import Poster from "@/components/poster";
import { ChevronRight } from "lucide-react";

interface Episode {
  id: string;
  item: LibraryItem;
  season: number;
  episode: number;
  airDate: string;
  title: string;
}

const fetcher = () => listLibrary({ mediaType: "tv" }) as Promise<LibraryItem[]>;

const WD = ["QUI", "SEX", "SÁB", "DOM", "SEG", "TER", "QUA"];

export default function CalendarioPage() {
  const router = useRouter();
  const { data: items } = useSWR<LibraryItem[]>("library-tv", fetcher);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  const monthLabel = cursor.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (!items) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    (async () => {
      const eps: Episode[] = [];
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      for (const it of items) {
        try {
          const r = await fetch(`/api/tmdb/tv/${it.tmdb_id}`);
          if (!r.ok) continue;
          const tv = await r.json();
          for (const s of tv.seasons ?? []) {
            if (!s.air_date) continue;
            const seasonStart = new Date(s.air_date);
            if (seasonStart > monthEnd) continue;
            try {
              const sr = await fetch(`/api/tmdb/tv/${it.tmdb_id}/season/${s.season_number}`);
              if (!sr.ok) continue;
              const seasonData = await sr.json();
              for (const ep of seasonData.episodes ?? []) {
                if (!ep.air_date) continue;
                const d = new Date(ep.air_date);
                if (d >= monthStart && d <= monthEnd) {
                  eps.push({
                    id: `${it.id}-${s.season_number}-${ep.episode_number}`,
                    item: it,
                    season: s.season_number,
                    episode: ep.episode_number,
                    airDate: ep.air_date,
                    title: ep.name ?? "",
                  });
                }
              }
            } catch {
              /* ignore */
            }
          }
        } catch {
          /* ignore */
        }
      }
      eps.sort((a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime());
      if (active) {
        setEpisodes(eps);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [items, cursor]);

  const dayMap = useMemo(() => {
    const m = new Map<string, Episode[]>();
    for (const e of episodes) {
      const key = e.airDate.slice(0, 10);
      const arr = m.get(key) ?? [];
      arr.push(e);
      m.set(key, arr);
    }
    return m;
  }, [episodes]);

  const upcoming = useMemo(
    () => episodes.filter((e) => new Date(e.airDate) >= new Date(new Date().toDateString())),
    [episodes],
  );

  return (
    <div className="flex flex-col gap-4 px-4 pt-3 pb-6 flex-1 overflow-y-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-tight">Calendário</h1>
        <p className="text-[13px] text-text-secondary">
          Próximos episódios ·{" "}
          {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
      </header>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="p-1.5 rounded-md bg-bg-elev"
          aria-label="Mês anterior"
        >
          <span className="text-text-secondary">‹</span>
        </button>
        <span className="text-sm font-semibold capitalize">{monthLabel}</span>
        <button
          onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="p-1.5 rounded-md bg-bg-elev"
          aria-label="Próximo mês"
        >
          <span className="text-text-secondary">›</span>
        </button>
      </div>

      <div className="flex justify-between text-[10px] font-semibold text-text-tertiary">
        {WD.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate() }).map(
          (_, i) => {
            const day = i + 1;
            const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
            const key = date.toISOString().slice(0, 10);
            const has = dayMap.has(key);
            const isToday =
              date.toDateString() === new Date().toDateString();
            return (
              <div key={day} className="flex flex-col items-center gap-1 py-1">
                <span
                  className={`text-[13px] ${isToday ? "text-accent font-bold" : "text-text-primary"}`}
                >
                  {day}
                </span>
                {has && (
                  <span className="w-1 h-1 rounded-full bg-accent" aria-label="Episódio" />
                )}
                {isToday && <span className="w-5 h-0.5 rounded-full bg-accent" />}
              </div>
            );
          },
        )}
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <span className="text-xs font-semibold text-text-tertiary">POR VIR</span>
        {loading ? (
          <div className="h-20 rounded-xl bg-bg-elev animate-pulse" />
        ) : upcoming.length === 0 ? (
          <p className="text-text-secondary text-sm py-6 text-center">
            Nenhum episódio por vir neste mês.
          </p>
        ) : (
          upcoming.map((e) => {
            const d = new Date(e.airDate);
            const wd = d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3).toUpperCase();
            return (
              <div
                key={e.id}
                onClick={() => router.push(`/titulo/${e.item.tmdb_id}`)}
                className="flex items-center gap-3 p-2.5 bg-bg-elev rounded-xl border border-border active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="w-10 h-12 rounded-lg bg-bg-elev-2 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-accent leading-none">
                    {d.getDate()}
                  </span>
                  <span className="text-[9px] font-semibold text-text-tertiary mt-0.5">{wd}</span>
                </div>
                <div className="w-10 h-14 shrink-0">
                  <Poster path={e.item.poster_path} alt={e.item.title} size="w92" className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{e.item.title}</h3>
                  <p className="text-xs text-text-secondary">
                    T{e.season} • E{e.episode}
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}