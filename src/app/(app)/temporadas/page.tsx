"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { listLibrary } from "@/lib/library";
import { markEpisode } from "@/lib/library";
import { mutate } from "swr";
import type { LibraryItem } from "@/lib/types";
import Poster from "@/components/poster";
import { ChevronRight } from "lucide-react";

const fetcher = () => listLibrary({ mediaType: "tv" }) as Promise<LibraryItem[]>;

interface SeasonInfo {
  item: LibraryItem;
  newSeasonNumber: number;
  airDate: string | null;
  status: "estreando" | "em_exibicao" | "em_breve";
}

export default function TemporadasPage() {
  const router = useRouter();
  const { data: items } = useSWR<LibraryItem[]>("library-tv", fetcher);
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!items) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    (async () => {
      const out: SeasonInfo[] = [];
      const now = new Date();
      for (const it of items) {
        try {
          const r = await fetch(`/api/tmdb/tv/${it.tmdb_id}`);
          if (!r.ok) continue;
          const tv = await r.json();
          const seasonsList = (tv.seasons ?? []).filter(
            (s: { season_number: number }) => s.season_number > 0,
          );
          for (const s of seasonsList) {
            if (s.season_number <= it.current_season) continue;
            const airDate = s.air_date ? new Date(s.air_date) : null;
            let status: SeasonInfo["status"] = "em_breve";
            if (airDate) {
              if (airDate <= now) status = "em_exibicao";
              else if (airDate.getTime() - now.getTime() < 1000 * 60 * 60 * 24 * 60)
                status = "estreando";
            }
            out.push({
              item: it,
              newSeasonNumber: s.season_number,
              airDate: s.air_date,
              status,
            });
          }
          const next = tv.next_episode_to_air;
          if (
            next &&
            next.season_number > it.current_season &&
            !out.find((o) => o.newSeasonNumber === next.season_number)
          ) {
            out.push({
              item: it,
              newSeasonNumber: next.season_number,
              airDate: next.air_date,
              status: "em_exibicao",
            });
          }
        } catch {
          /* ignore */
        }
      }
      out.sort((a, b) => {
        const da = a.airDate ? new Date(a.airDate).getTime() : Infinity;
        const db = b.airDate ? new Date(b.airDate).getTime() : Infinity;
        return da - db;
      });
      if (active) {
        setSeasons(out);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [items]);

  return (
    <div className="flex flex-col gap-5 px-4 pt-3 pb-6 flex-1 overflow-y-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-tight">Novas temporadas</h1>
        <p className="text-[13px] text-text-secondary">
          Séries que você acompanha com estreias próximas
        </p>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[96px] rounded-xl bg-bg-elev animate-pulse" />
          ))}
        </div>
      ) : seasons.length === 0 ? (
        <p className="text-text-secondary text-sm py-12 text-center">
          Nenhuma nova temporada anunciada para as séries que você acompanha.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {seasons.map((s) => {
            const dateFmt = s.airDate
              ? new Date(s.airDate).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "Em breve";
            const statusInfo =
              s.status === "estreando"
                ? { label: "Estreando", dot: "bg-warning", text: "text-warning" }
                : { label: "Em exibição", dot: "bg-success", text: "text-success" };
            return (
              <div
                key={`${s.item.id}-${s.newSeasonNumber}`}
                onClick={() => router.push(`/titulo/${s.item.tmdb_id}`)}
                className="flex items-center gap-3 p-2.5 bg-bg-elev rounded-xl border border-border active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="w-[54px] h-[80px] shrink-0">
                  <Poster path={s.item.poster_path} alt={s.item.title} size="w92" className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <h3 className="text-[15px] font-semibold truncate">{s.item.title}</h3>
                  <p className="text-xs text-text-secondary">
                    T{s.newSeasonNumber} · {dateFmt}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                    <span className={`text-[11px] font-semibold ${statusInfo.text}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markEpisode(s.item.id, s.newSeasonNumber, 0);
                    mutate("library-tv");
                    mutate("watching");
                  }}
                  className="text-xs font-semibold text-accent px-3 py-2 active:scale-95"
                >
                  Acompanhar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}