"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  markMovieWatched,
  rewatchMovie,
  removeFromLibrary,
  setStatus,
  listWatched,
  listLibrary,
} from "@/lib/library";
import type { LibraryItem, WatchedEpisode, TmdbTv, TmdbMovie, TmdbSeason } from "@/lib/types";
import EpisodeRow from "@/components/episode-row";
import { backdropUrl, posterUrl } from "@/lib/images";
import { ChevronLeft, MoreVertical, Check, RotateCcw, Trash2 } from "lucide-react";

export default function TituloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tmdbId = Number(id);
  const router = useRouter();
  const [libItem, setLibItem] = useState<LibraryItem | null>(null);
  const [tv, setTv] = useState<TmdbTv | null>(null);
  const [movie, setMovie] = useState<TmdbMovie | null>(null);
  const [seasons, setSeasons] = useState<Record<number, TmdbSeason>>({});
  const [watchedMap, setWatchedMap] = useState<Record<string, WatchedEpisode>>({});
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const items = await listLibrary();
      const item = items.find((i) => i.tmdb_id === tmdbId);
      if (item && item.media_type === "tv") {
        const r = await fetch(`/api/tmdb/tv/${tmdbId}`);
        if (r.ok) {
          const data: TmdbTv = await r.json();
          if (!active) return;
          setTv(data);
          setLibItem(item);
          const watched = await listWatched(item.id, item.current_season);
          const wmap: Record<string, WatchedEpisode> = {};
          for (const w of watched) wmap[`${w.season}-${w.episode}`] = w;
          if (!active) return;
          setWatchedMap(wmap);
          setExpandedSeason(item.current_season);
        }
      } else if (item && item.media_type === "movie") {
        const r = await fetch(`/api/tmdb/movie/${tmdbId}`);
        if (r.ok) {
          const data: TmdbMovie = await r.json();
          if (!active) return;
          setMovie(data);
          setLibItem(item);
        }
      } else if (item === undefined) {
        // ainda nao na library: tenta detectar tipo
        const tvR = await fetch(`/api/tmdb/tv/${tmdbId}`).catch(() => null);
        if (tvR && tvR.ok) {
          const data: TmdbTv = await tvR.json();
          if (!active) return;
          setTv(data);
        } else {
          const mR = await fetch(`/api/tmdb/movie/${tmdbId}`);
          if (mR.ok) {
            const data: TmdbMovie = await mR.json();
            if (!active) return;
            setMovie(data);
          }
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [tmdbId]);

  async function expandSeason(s: number) {
    if (expandedSeason === s) {
      setExpandedSeason(null);
      return;
    }
    setExpandedSeason(s);
    if (seasons[s] || !tv) return;
    try {
      const r = await fetch(`/api/tmdb/tv/${tmdbId}/season/${s}`);
      if (r.ok) {
        const data: TmdbSeason = await r.json();
        setSeasons((prev) => ({ ...prev, [s]: data }));
        if (libItem) {
          const watched = await listWatched(libItem.id, s);
          setWatchedMap((prev) => {
            const next = { ...prev };
            for (const w of watched) next[`${w.season}-${w.episode}`] = w;
            return next;
          });
        }
      }
    } catch {}
  }

  async function reloadWatched(s: number) {
    if (!libItem) return;
    const watched = await listWatched(libItem.id, s);
    setWatchedMap((prev) => {
      const next: Record<string, WatchedEpisode> = {};
      for (const k of Object.keys(prev)) {
        if (k.startsWith(`${s}-`)) continue;
        next[k] = prev[k];
      }
      for (const w of watched) next[`${w.season}-${w.episode}`] = w;
      return next;
    });
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const isMovie = !!movie && !tv;
  const title = tv?.name ?? movie?.title ?? "—";
  const meta = isMovie
    ? `${movie?.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}min` : ""} · ${movie?.release_date?.slice(0, 4) ?? ""}`
    : `${tv?.number_of_seasons ?? 0} temporadas · ${tv?.first_air_date?.slice(0, 4) ?? ""} · ${(tv?.next_episode_to_air || tv?.last_episode_to_air) ? "Em exibição" : ""}`;
  const genres = tv?.genres ?? movie?.genres ?? [];
  const credits = tv?.credits ?? movie?.credits;
  const backdrop = isMovie ? movie?.backdrop_path : tv?.backdrop_path;
  const overview = tv?.overview ?? movie?.overview ?? "";

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      <div className="relative h-[280px] shrink-0 bg-bg-elev-2">
        {backdrop ? (
          <img
            src={backdropUrl(backdrop, "w780") ?? ""}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(11,11,14,0.3) 0%, rgba(11,11,14,0.5) 50%, rgba(11,11,14,0.95) 85%, rgba(11,11,14,1) 100%)",
          }}
        />
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 safe-top">
          <button onClick={() => router.back()} className="p-1" aria-label="Voltar">
            <ChevronLeft className="w-6 h-6 text-text-primary" />
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1"
            aria-label="Mais opções"
          >
            <MoreVertical className="w-6 h-6 text-text-primary" />
          </button>
        </div>
        {menuOpen && libItem && (
          <div className="absolute top-14 right-4 bg-bg-elev border border-border rounded-lg shadow-lg shadow-black/50 py-2 w-48 z-50">
            <button
              onClick={async () => {
                await removeFromLibrary(libItem.id);
                router.push("/assistindo");
              }}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-text-secondary active:bg-bg-elev-2"
            >
              <Trash2 className="w-4 h-4" />
              Remover da biblioteca
            </button>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          <p className="text-[13px] text-text-secondary">{meta}</p>
          {genres.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {genres.slice(0, 5).map((g) => (
                <span
                  key={g.id}
                  className="px-2.5 py-1 rounded-full bg-bg-elev/80 border border-border text-[11px] font-medium text-text-secondary"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
        {libItem ? (
          <button
            onClick={async () => {
              if (libItem.status === "watching") await setStatus(libItem.id, "completed");
              else if (libItem.status === "completed") await setStatus(libItem.id, "watching");
              const items = await listLibrary();
              setLibItem(items.find((i) => i.tmdb_id === tmdbId) ?? null);
            }}
            className="self-start px-4 py-2 rounded-full bg-accent text-text-primary text-[13px] font-semibold active:scale-95"
          >
            {libItem.status === "watching"
              ? "Assistindo"
              : libItem.status === "completed"
                ? "Concluído"
                : "Adicionar"}
          </button>
        ) : null}

        {overview && (
          <section className="flex flex-col gap-1.5">
            <h2 className="text-[12px] font-semibold text-text-tertiary">SINOPSE</h2>
            <p className="text-sm text-text-secondary leading-relaxed">{overview}</p>
          </section>
        )}

        {credits && credits.cast.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-[12px] font-semibold text-text-tertiary">ELENCO</h2>
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1">
              {credits.cast.slice(0, 8).map((c) => (
                <div key={c.id} className="w-14 shrink-0 flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-bg-elev-2 overflow-hidden">
                    {c.profile_path && (
                      <img
                        src={posterUrl(c.profile_path, "w92") ?? ""}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-center truncate w-full">{c.name.split(" ")[0]}</span>
                  <span className="text-[10px] text-text-tertiary text-center truncate w-full">{c.character}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {isMovie && libItem ? (
          <section className="flex flex-col gap-3">
            {libItem.status === "completed" ? (
              <div className="flex items-center gap-2 p-3 bg-bg-elev rounded-lg">
                <Check className="w-4 h-4 text-success" />
                <span className="text-sm text-text-secondary">
                  Visto {libItem.runtime_minutes ? `· ${Math.floor(libItem.runtime_minutes / 60)}h ${libItem.runtime_minutes % 60}min` : ""}
                </span>
                <button
                  className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-elev-2 border border-border text-[13px] font-medium text-accent active:scale-95"
                  onClick={async () => {
                    await rewatchMovie(libItem.id);
                    const items = await listLibrary();
                    setLibItem(items.find((i) => i.tmdb_id === tmdbId) ?? null);
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Revisto
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  await markMovieWatched(libItem.id, tmdbId);
                  const items = await listLibrary();
                  setLibItem(items.find((i) => i.tmdb_id === tmdbId) ?? null);
                }}
                className="px-4 py-3 rounded-xl bg-accent text-text-primary text-sm font-semibold active:scale-95"
              >
                Marcar visto
              </button>
            )}
          </section>
        ) : null}

        {tv ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-[12px] font-semibold text-text-tertiary">TEMPORADAS</h2>
            {tv.seasons
              .filter((s) => s.season_number > 0)
              .map((s) => (
                <div key={s.season_number}>
                  <button
                    onClick={() => expandSeason(s.season_number)}
                    className="w-full flex items-center gap-3 p-3 bg-bg-elev rounded-lg border border-border active:scale-[0.99]"
                  >
                    <div className="flex-1 flex flex-col gap-0.5 text-left">
                      <span className="text-[15px] font-semibold">Temporada {s.season_number}</span>
                      <span className="text-xs text-text-secondary">
                        {s.episode_count} eps · {s.air_date?.slice(0, 4) ?? ""}
                      </span>
                    </div>
                    <div className="w-16 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{
                          width: `${
                            s.episode_count
                              ? Math.min(100, Math.round((countWatchedInSeason(s.season_number) / s.episode_count) * 100))
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-text-tertiary">
                      {countWatchedInSeason(s.season_number)}/{s.episode_count}
                    </span>
                  </button>
                  {expandedSeason === s.season_number && seasons[s.season_number] && (
                    <div className="mt-1 border-t border-border">
                      {seasons[s.season_number].episodes?.map((ep) => {
                        const w = watchedMap[`${s.season_number}-${ep.episode_number}`];
                        return (
                          <EpisodeRow
                            key={ep.id}
                            libraryId={libItem?.id ?? ""}
                            season={s.season_number}
                            episode={ep.episode_number}
                            title={ep.name}
                            runtime={ep.runtime}
                            airDate={ep.air_date}
                            synopsis={ep.overview}
                            watched={!!w}
                            watchCount={w?.watch_count ?? 0}
                            tmdbId={tmdbId}
                            onUpdated={() => reloadWatched(s.season_number)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
          </section>
        ) : null}
      </div>
    </div>
  );

  function countWatchedInSeason(s: number): number {
    return Object.values(watchedMap).filter((w) => w.season === s).length;
  }
}