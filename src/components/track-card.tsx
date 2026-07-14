"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Poster from "./poster";
import { markEpisode } from "@/lib/library";
import type { LibraryItem } from "@/lib/types";
import { Check, ChevronRight } from "lucide-react";

const REVEAL_MAX = 120;
const CONFIRM_AT = 50;
const TAP_THRESHOLD = 8;

export default function TrackCard({
  item,
  totalEps,
  watchedCount,
  onUpdated,
}: {
  item: LibraryItem;
  totalEps?: number;
  watchedCount?: number;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [popping, setPopping] = useState(false);
  const [epDisplay, setEpDisplay] = useState<number>(
    watchedCount ?? item.current_episode,
  );
  const [dx, setDx] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const startRef = useRef<{ x: number; active: boolean; moved: boolean }>({
    x: 0,
    active: false,
    moved: false,
  });
  const dxRef = useRef(0);

  const total = totalEps ?? 0;
  const watched = epDisplay;
  const remaining = total ? Math.max(0, total - watched) : 0;
  const pct = total ? Math.min(100, Math.round((watched / total) * 100)) : 0;

  function setBoth(v: number) {
    dxRef.current = v;
    setDx(v);
  }

  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      const next = item.current_episode + 1;
      await markEpisode(item.id, item.current_season, next, item.tmdb_id);
      setEpDisplay(next);
      setFlash(true);
      setPopping(true);
      setTimeout(() => setFlash(false), 450);
      setTimeout(() => setPopping(false), 350);
      onUpdated?.();
    } finally {
      setBusy(false);
      setSnapping(true);
      setBoth(0);
      setTimeout(() => setSnapping(false), 250);
    }
  }

  function onStart(clientX: number) {
    startRef.current = { x: clientX, active: true, moved: false };
    setSnapping(false);
  }
  function onMove(clientX: number) {
    if (!startRef.current.active) return;
    const raw = clientX - startRef.current.x;
    if (Math.abs(raw) > TAP_THRESHOLD) startRef.current.moved = true;
    if (raw < 0) {
      const clamped = Math.max(-REVEAL_MAX, raw);
      setBoth(clamped);
    } else if (startRef.current.moved) {
      setBoth(0);
    }
  }
  function onEnd() {
    if (!startRef.current.active) return;
    const wasTap = !startRef.current.moved;
    startRef.current.active = false;
    if (wasTap) {
      router.push(`/titulo/${item.tmdb_id}`);
      return;
    }
    if (-dxRef.current > CONFIRM_AT) {
      confirm();
    } else {
      setSnapping(true);
      setBoth(0);
      setTimeout(() => setSnapping(false), 250);
    }
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden touch-none select-none"
      onTouchStart={(e) => onStart(e.touches[0].clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={onEnd}
      onPointerDown={(e) => onStart(e.clientX)}
      onPointerMove={(e) => {
        if (e.buttons === 1) onMove(e.clientX);
      }}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
    >
      <div
        className="absolute inset-0 flex items-center justify-end px-5 rounded-xl bg-success/15"
        style={{ opacity: Math.min(1, -dx / REVEAL_MAX) }}
      >
        <div
          className="flex items-center gap-2 text-success text-xs font-semibold"
          style={{ transform: `translateX(${Math.min(0, dx + REVEAL_MAX)}px)` }}
        >
          <Check className="w-5 h-5" strokeWidth={3} />
          Marcar visto
        </div>
      </div>

      <div
        className={`flex gap-3 p-3 bg-bg-elev rounded-xl border border-border ${
          flash ? "bg-success/10 border-success/30" : ""
        } ${snapping ? "transition-transform duration-200 ease-out" : ""}`}
        style={{ transform: `translateX(${dx}px)` }}
      >
        <div className="w-[60px] h-[88px] shrink-0 pointer-events-none">
          <Poster
            path={item.poster_path}
            alt={item.title}
            size="w92"
            className="w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold truncate flex-1">
              {item.title}
            </h3>
            <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0 mt-0.5" />
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-accent-dim text-accent text-[10px] font-semibold">
              Assistindo
            </span>
          </div>
          <p className="text-[13px] font-medium text-text-secondary transition-opacity duration-150">
            T{item.current_season} • E{watched}
            {total ? ` de ${total}` : ""}
          </p>
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-tertiary">
              {total ? `Faltam ${remaining} eps` : "—"}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            confirm();
          }}
          disabled={busy}
          aria-label="Marcar episódio visto"
          className={`shrink-0 self-center w-9 h-9 rounded-full bg-accent flex items-center justify-center active:scale-90 transition-transform ${
            popping ? "scale-125" : "scale-100"
          } disabled:opacity-50`}
        >
          <Check
            className="w-5 h-5"
            strokeWidth={3}
            style={{
              color: popping ? "#5BD68F" : "var(--color-text-primary)",
            }}
          />
        </button>
      </div>
    </div>
  );
}