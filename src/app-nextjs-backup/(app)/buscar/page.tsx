"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Poster from "@/components/poster";
import { addToLibrary, listLibrary } from "@/lib/library";
import { mutate } from "swr";
import type { TmdbSearchResult } from "@/lib/types";
import { Search as SearchIcon, Clock, ArrowUpLeft, ArrowLeft, Flame, BarChart3, Star, Sparkle, Info } from "lucide-react";

const RECENTS_KEY = "watchtv:recent-searches";

export default function BuscarPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "tv" | "movie">("all");
  const [exploreView, setExploreView] = useState<
    null | "trending" | "popular" | "originals" | "anime"
  >(null);
  const { data: explore } = useSWR("/api/tmdb/explore", (url) =>
    fetch(url).then((r) => r.json()),
  );

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecents(JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]"));
  }, []);

  useEffect(() => {
    if (!debounced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    setSearching(true);
    fetch(`/api/tmdb/search?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []))
      .finally(() => setSearching(false));
  }, [debounced]);

  function saveRecent(term: string) {
    if (!term) return;
    const next = [term, ...recents.filter((r) => r !== term)].slice(0, 6);
    setRecents(next);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  }

  function clearRecents() {
    setRecents([]);
    localStorage.removeItem(RECENTS_KEY);
  }

  const filtered = results.filter((r) => filter === "all" || r.media_type === filter);

  const exploreItems: TmdbSearchResult[] = exploreView === null ? [] :
    exploreView === "trending" ? (explore?.trending ?? []) :
    exploreView === "popular" ? [...(explore?.movies ?? []), ...(explore?.tv ?? [])] :
    exploreView === "originals" ? (explore?.tv ?? []).filter((r: TmdbSearchResult) => r.media_type === "tv") :
    exploreView === "anime" ? (explore?.tv ?? []).filter((r: TmdbSearchResult) => r.media_type === "tv") :
    [];
  const exploreTitle =
    exploreView === "trending" ? "Trending" :
    exploreView === "popular" ? "Populares" :
    exploreView === "originals" ? "Originais" :
    exploreView === "anime" ? "Animes" : "";

  return (
    <div className="flex flex-col gap-4 px-4 pt-3 pb-6 flex-1 overflow-y-auto">
      <header className="flex flex-col gap-2.5">
        <h1 className="text-[28px] font-bold leading-tight">Buscar</h1>
        <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-bg-elev border border-border">
          <SearchIcon className="w-[18px] h-[18px] text-text-tertiary shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveRecent(q)}
            placeholder="Séries, filmes, animes…"
            className="bg-transparent outline-none text-sm flex-1 text-text-primary placeholder:text-text-tertiary"
          />
        </div>
        <div className="flex gap-2">
          {([
            ["all", "Tudo"],
            ["tv", "Séries"],
            ["movie", "Filmes"],
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
      </header>

      {debounced ? (
        searching ? (
          <p className="text-text-secondary text-sm py-8 text-center">Buscando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-text-secondary text-sm py-8 text-center">
            Nenhum resultado para &ldquo;{debounced}&rdquo;.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((r) => (
              <SearchRow key={`${r.media_type}-${r.id}`} r={r} />
            ))}
          </div>
        )
      ) : (
        <>
          {exploreView !== null ? (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExploreView(null)}
                  className="p-1.5 rounded-full bg-bg-elev active:scale-95"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="w-4 h-4 text-text-secondary" />
                </button>
                <h2 className="text-[15px] font-semibold flex-1">{exploreTitle}</h2>
                <span className="text-xs text-text-tertiary">{exploreItems.length}</span>
              </div>
              {exploreItems.length === 0 ? (
                <p className="text-text-secondary text-sm py-8 text-center">
                  Nada por aqui ainda.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {exploreItems.map((r) => (
                    <SearchRow key={`${r.media_type}-${r.id}`} r={r} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            explore && (
              <section className="flex flex-col gap-2.5">
                <span className="text-[13px] font-semibold text-text-tertiary">EXPLORAR</span>
                <div className="grid grid-cols-2 gap-2">
                  <ExploreCard label="Trending" icon={Flame} onClick={() => setExploreView("trending")} />
                  <ExploreCard label="Populares" icon={BarChart3} onClick={() => setExploreView("popular")} />
                  <ExploreCard label="Originais" icon={Star} onClick={() => setExploreView("originals")} />
                  <ExploreCard label="Animes" icon={Sparkle} onClick={() => setExploreView("anime")} />
                </div>
              </section>
            )
          )}

          {recents.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-text-tertiary">
                  BUSCAS RECENTES
                </span>
                <button onClick={clearRecents} className="text-xs text-text-tertiary">
                  Limpar
                </button>
              </div>
              {recents.map((r) => (
                <button
                  key={r}
                  onClick={() => setQ(r)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-bg-elev text-left"
                >
                  <Clock className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-[13px] font-medium flex-1 truncate text-text-primary">
                    {r}
                  </span>
                  <ArrowUpLeft className="w-3.5 h-3.5 text-text-tertiary" />
                </button>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SearchRow({ r }: { r: TmdbSearchResult }) {
  const router = useRouter();
  const title = r.name ?? r.title ?? "—";
  const date = r.release_date ?? r.first_air_date ?? null;
  const { data: lib } = useSWR("library-all", () => listLibrary() as Promise<{ tmdb_id: number; media_type: string }[]>);
  const inLibrary = !!lib?.some(
    (i) => i.tmdb_id === r.id && i.media_type === r.media_type,
  );
  return (
    <div
      onClick={() => {
        if (inLibrary) router.push(`/titulo/${r.id}`);
      }}
      className={`flex items-center gap-3 p-2.5 bg-bg-elev rounded-xl border border-border ${
        inLibrary ? "active:scale-[0.98] cursor-pointer" : ""
      }`}
    >
      <div className="w-[44px] h-[66px] shrink-0">
        <Poster path={r.poster_path} alt={title} size="w92" className="w-full h-full" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate">{title}</h3>
        <p className="text-xs text-text-tertiary">
          {date ? date.slice(0, 4) : "—"} · {r.media_type === "tv" ? "Série" : "Filme"}
        </p>
      </div>
      {inLibrary ? (
        <Info className="w-4 h-4 text-text-tertiary shrink-0" />
      ) : null}
      <div onClick={(e) => e.stopPropagation()}>
        <AddButton r={r} inLibrary={inLibrary} />
      </div>
    </div>
  );
}

function AddButton({ r, inLibrary }: { r: TmdbSearchResult; inLibrary: boolean }) {
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const title = r.name ?? r.title ?? "—";
  if (inLibrary) {
    return (
      <span className="text-[11px] font-semibold text-text-tertiary px-2">Na biblioteca</span>
    );
  }
  return (
    <button
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        setErr(null);
        try {
          await addToLibrary({
            tmdb_id: r.id,
            media_type: r.media_type as "tv" | "movie",
            status: r.media_type === "movie" ? "planned" : "watching",
            title,
            poster_path: r.poster_path,
            backdrop_path: r.backdrop_path,
            release_date: r.release_date ?? r.first_air_date ?? null,
          });
          setAdded(true);
          if (r.media_type === "tv") {
            mutate("watching");
            mutate("library-tv");
            mutate("library-all");
          } else {
            mutate("library-movie");
            mutate("library-all");
          }
        } catch (e: unknown) {
          const msg =
            e && typeof e === "object" && "message" in e
              ? String((e as { message?: unknown }).message)
              : String(e);
          setErr(msg);
        } finally {
          setBusy(false);
        }
      }}
      disabled={added || busy}
      className={`px-3 py-2 rounded-lg text-xs font-semibold active:scale-95 ${
        added
          ? "bg-success/20 text-success"
          : err
            ? "bg-warning/20 text-warning"
            : "bg-accent text-text-primary"
      }`}
      title={err ?? undefined}
    >
      {added ? "Adicionado" : err ? "Tentar de novo" : busy ? "…" : "Adicionar"}
    </button>
  );
}

function ExploreCard({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Flame;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="h-[72px] p-3 flex flex-col justify-between rounded-lg bg-bg-elev border border-border active:scale-95 transition-transform text-left"
    >
      <Icon className="w-[18px] h-[18px] text-accent" />
      <span className="text-[13px] font-semibold">{label}</span>
    </button>
  );
}