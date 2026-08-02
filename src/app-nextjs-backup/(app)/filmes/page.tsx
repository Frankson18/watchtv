"use client";

import { useMemo } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Info } from "lucide-react";
import Poster from "@/components/poster";
import { listLibrary, markMovieWatched } from "@/lib/library";
import type { LibraryItem } from "@/lib/types";

const fetcher = () => listLibrary({ mediaType: "movie" }) as Promise<LibraryItem[]>;

export default function FilmesPage() {
  const { data: items, isLoading } = useSWR<LibraryItem[]>("library-movie", fetcher);

  const paraVer = (items ?? []).filter((it) => it.status === "watching" || it.status === "planned");
  const vistos = (items ?? []).filter((it) => it.status === "completed");
  const futures = useMemo(
    () => (items ?? []).filter((it) => (it.release_date ? new Date(it.release_date) > new Date() : false)),
    [items],
  );

  return (
    <div className="flex flex-col gap-5 px-4 pt-3 pb-6 flex-1 overflow-y-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-tight">Filmes</h1>
        <p className="text-[13px] text-text-secondary">Sua lista de filmes por embarque</p>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-bg-elev animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <Section
            title="Para ver"
            count={paraVer.length}
            items={paraVer}
            emptyHint="Adicione filmes para ver."
            ctaHref="/buscar"
            ctaLabel="Buscar"
          />
          <Section title="Vistos" count={vistos.length} items={vistos} emptyHint="Nenhum filme visto." />
          <Section
            title="Lançamentos futuros"
            count={futures.length}
            items={futures}
            emptyHint="Nenhum lançamento futuro na lista."
          />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  items,
  emptyHint,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  count: number;
  items: LibraryItem[];
  emptyHint: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <span className="text-xs text-text-tertiary">{count}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {items.length === 0 ? (
          <div className="flex-1 h-40 rounded-lg bg-bg-elev/50 border border-dashed border-border flex flex-col items-center justify-center gap-2 text-center px-4">
            <span className="text-sm text-text-secondary">{emptyHint}</span>
            {ctaHref && ctaLabel && (
              <a href={ctaHref} className="text-sm font-semibold text-accent">
                {ctaLabel}
              </a>
            )}
          </div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="w-[108px] shrink-0 flex flex-col gap-1.5">
              <Link
                href={`/titulo/${it.tmdb_id}`}
                className="relative w-[108px] h-[162px] block active:scale-95 transition-transform"
              >
                <Poster path={it.poster_path} alt={it.title} size="w185" className="w-full h-full" />
                <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-bg-elev-2/90 border border-border flex items-center justify-center">
                  <Info className="w-3.5 h-3.5 text-text-secondary" />
                </div>
              </Link>
              <span className="text-[13px] font-semibold truncate">{it.title}</span>
              <span className="text-[11px] text-text-tertiary">
                {it.release_date?.slice(0, 4) ?? "—" }
              </span>
              {it.status !== "completed" ? (
                <button
                  onClick={async () => {
                    await markMovieWatched(it.id, it.tmdb_id);
                    mutate("library-movie");
                  }}
                  className="text-[11px] font-semibold text-accent active:scale-95"
                >
                  Marcar visto
                </button>
              ) : (
                <span className="text-[11px] font-semibold text-success">Visto</span>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}