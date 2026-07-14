"use client";

import { useState } from "react";
import { markEpisode, rewatchEpisode } from "@/lib/library";
import { Check } from "lucide-react";

export default function EpisodeRow({
  libraryId,
  season,
  episode,
  title,
  runtime,
  airDate,
  synopsis,
  watched,
  watchCount,
  tmdbId,
  onUpdated,
}: {
  libraryId: string;
  season: number;
  episode: number;
  title: string;
  runtime: number | null;
  airDate: string | null;
  synopsis: string;
  watched: boolean;
  watchCount: number;
  tmdbId: number;
  onUpdated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [popping, setPopping] = useState(false);
  const [localWatched, setLocalWatched] = useState(watched);
  const [localCount, setLocalCount] = useState(watchCount);

  async function onCheck() {
    if (busy) return;
    setBusy(true);
    setPopping(true);
    setTimeout(() => setPopping(false), 350);
    try {
      if (!localWatched) {
        await markEpisode(libraryId, season, episode, tmdbId);
        setLocalWatched(true);
        setLocalCount((c) => c + 1);
      } else {
        await rewatchEpisode(libraryId, season, episode);
        setLocalCount((c) => c + 1);
      }
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  }

  const dateFmt = airDate
    ? new Date(airDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : "—";

  return (
    <div className="flex gap-3 px-4 py-3 active:bg-bg-elev/50 transition-colors">
      <button
        onClick={onCheck}
        disabled={busy}
        aria-label="Marcar episódio"
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 active:scale-90 transition-transform ${
          popping ? "scale-125" : "scale-100"
        } ${
          localWatched
            ? "bg-accent"
            : "border-2 border-border"
        }`}
      >
        {localWatched && (
          <Check
            className="w-4 h-4 text-text-primary"
            strokeWidth={3}
            style={{ color: popping ? "#5BD68F" : "var(--color-text-primary)" }}
          />
        )}
      </button>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-semibold leading-tight">
            E{episode} · {title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {localCount > 1 && (
              <span className="text-[11px] font-bold text-accent">×{localCount}</span>
            )}
            <span className="text-[12px] text-text-tertiary">{dateFmt}</span>
          </div>
        </div>
        {synopsis && (
          <p className="text-[12px] text-text-secondary leading-snug line-clamp-2">
            {synopsis}
          </p>
        )}
        <span className="text-[11px] text-text-tertiary">
          {runtime ? `${runtime} min` : "—"}
        </span>
      </div>
    </div>
  );
}