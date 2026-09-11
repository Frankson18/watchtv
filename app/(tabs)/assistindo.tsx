import { useCallback, useRef, useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TrackCard from "@/components/track-card";
import { listLibrary, listRecentWatched, type RecentWatchedEntry } from "@/lib/library";
import { firstUnwatchedEpisode } from "@/lib/progress";
import { tmdb } from "@/lib/tmdb";
import type { LibraryItem, TmdbSeason } from "@/lib/types";

interface CardData {
  item: LibraryItem;
  epTitle: string;
  totalEps: number;
  watched: number;
  displayEpisode: number;
  nextSeason: number | null;
  nextEpisode: number | null;
}

type SortMode = "recent" | "alpha" | "oldest";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const HISTORY_PAGE = 15;

const seasonCache = new Map<string, TmdbSeason | null>();

async function getSeason(tmdbId: number, season: number): Promise<TmdbSeason | null> {
  const key = `${tmdbId}-${season}`;
  if (!seasonCache.has(key)) {
    try {
      seasonCache.set(key, await tmdb.tvSeason(tmdbId, season));
    } catch {
      seasonCache.set(key, null);
    }
  }
  return seasonCache.get(key) ?? null;
}

function toLibraryItem(e: RecentWatchedEntry): LibraryItem {
  return {
    id: e.library_id,
    user_id: "",
    tmdb_id: e.tmdb_id,
    media_type: e.media_type,
    status: "watching",
    title: e.title,
    poster_path: e.poster_path,
    backdrop_path: null,
    release_date: null,
    runtime_minutes: null,
    current_season: e.season,
    current_episode: e.episode,
    total_seasons: null,
    last_season_air_date: null,
    last_watched_at: e.watched_at,
    created_at: e.watched_at,
    updated_at: e.watched_at,
  };
}

async function buildHistoryCards(entries: RecentWatchedEntry[]): Promise<CardData[]> {
  const out: CardData[] = [];
  for (const e of entries) {
    const seasonData = await getSeason(e.tmdb_id, e.season);
    const ep = seasonData?.episodes?.find((x) => x.episode_number === e.episode);
    out.push({
      item: toLibraryItem(e),
      epTitle:
        ep?.name ??
        `S${String(e.season).padStart(2, "0")} E${String(e.episode).padStart(2, "0")}`,
      totalEps: 0,
      watched: e.episode,
      displayEpisode: e.episode,
      nextSeason: null,
      nextEpisode: null,
    });
  }
  return out;
}

const sectionTitle = { fontSize: 20, fontWeight: "700" as const, color: "#F5F5F7" };

export default function AssistindoScreen() {
  const insets = useSafeAreaInsets();
  // Histórico em ordem DECRESCENTE (mais novo primeiro). A lista é invertida,
  // então o índice 0 aparece embaixo — deixando os mais novos no fim da tela.
  const [history, setHistory] = useState<CardData[]>([]);
  const [next, setNext] = useState<CardData[]>([]);
  const [stalled, setStalled] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showSort, setShowSort] = useState(false);

  const historyOffset = useRef(0);
  const hasMore = useRef(false);
  const loadingMoreRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const prependRef = useRef(false);
  const [anchorY, setAnchorY] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const items = (await listLibrary({ mediaType: "tv" })).filter((i) => i.status !== "dropped");

    const nextCards: CardData[] = [];
    const stalledCards: CardData[] = [];

    await Promise.all(
      items.map(async (it) => {
        try {
          const tv = await tmdb.tv(it.tmdb_id);
          const next = firstUnwatchedEpisode(tv, it.current_season, it.current_episode);
          if (!next) return; // em dia ou concluída — não vai para "assistir a seguir"

          const season = tv.seasons?.find((s) => s.season_number === next.season);
          const totalEps = season?.episode_count ?? 0;
          const lastWatchedTime = it.last_watched_at ? new Date(it.last_watched_at).getTime() : 0;
          const isOld = lastWatchedTime > 0 && Date.now() - lastWatchedTime > THIRTY_DAYS;
          const neverWatched = it.current_episode === 0 && !it.last_watched_at;

          const base = {
            item: it,
            totalEps,
            watched: it.current_episode,
            displayEpisode: next.episode,
            nextSeason: next.season,
            nextEpisode: next.episode,
          };

          const nextEp = tv.next_episode_to_air;
          let epName = "";
          if (nextEp && nextEp.season_number === next.season && nextEp.episode_number === next.episode) {
            epName = nextEp.name ?? "";
          } else {
            const seasonData = await getSeason(it.tmdb_id, next.season);
            epName =
              seasonData?.episodes?.find((x) => x.episode_number === next.episode)?.name ?? "";
          }

          if (neverWatched) {
            stalledCards.push({ ...base, epTitle: "Comece a assistir" });
          } else if (isOld) {
            stalledCards.push({ ...base, epTitle: epName });
          } else {
            nextCards.push({ ...base, epTitle: epName });
          }
        } catch {}
      }),
    );

    let historyCards: CardData[] = [];
    try {
      const recent = await listRecentWatched(HISTORY_PAGE, 0);
      // ascendente: mais antigo primeiro, mais novo logo acima de "Assistir a seguir"
      historyCards = [...(await buildHistoryCards(recent))].reverse();
      historyOffset.current = historyCards.length;
      hasMore.current = recent.length === HISTORY_PAGE;
    } catch {
      historyOffset.current = 0;
      hasMore.current = false;
    }

    nextCards.sort((a, b) => (b.item.last_watched_at ?? "").localeCompare(a.item.last_watched_at ?? ""));
    stalledCards.sort((a, b) => (a.item.last_watched_at ?? "0").localeCompare(b.item.last_watched_at ?? "0"));

    setNext(nextCards);
    setStalled(stalledCards);
    setHistory(historyCards);
    setLoading(false);
  }, []);

  const loadMoreHistory = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const older = await listRecentWatched(HISTORY_PAGE, historyOffset.current);
      if (older.length > 0) {
        const cards = await buildHistoryCards(older);
        historyOffset.current += cards.length;
        hasMore.current = older.length === HISTORY_PAGE;
        prependRef.current = true;
        setHistory((prev) => [...[...cards].reverse(), ...prev]);
      } else {
        hasMore.current = false;
      }
    } catch {
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const onScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    offsetRef.current = y;
    if (!ready) return;
    if (y < 80 && hasMore.current && !loadingMoreRef.current) loadMoreHistory();
  };

  const onContentSizeChange = (_w: number, h: number) => {
    if (prependRef.current) {
      const delta = h - contentHeightRef.current;
      scrollRef.current?.scrollTo({ y: offsetRef.current + delta, animated: false });
      prependRef.current = false;
    }
    contentHeightRef.current = h;
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const sortedNext = useMemo(() => {
    const arr = [...next];
    if (sortMode === "alpha") arr.sort((a, b) => a.item.title.localeCompare(b.item.title));
    else if (sortMode === "oldest") arr.sort((a, b) => (a.item.last_watched_at ?? "").localeCompare(b.item.last_watched_at ?? ""));
    else arr.sort((a, b) => (b.item.last_watched_at ?? "").localeCompare(a.item.last_watched_at ?? ""));
    return arr;
  }, [next, sortMode]);

  const hasAny = history.length > 0 || sortedNext.length > 0 || stalled.length > 0;

  const sortLabels: Record<SortMode, string> = {
    recent: "Mais recente",
    alpha: "A-Z",
    oldest: "Mais antigo",
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B0B0E" }}>
        <ActivityIndicator size="large" color="#F24E4E" />
      </View>
    );
  }

  const nextSection = (
    <View
      style={{ gap: 14 }}
      onLayout={(e) => {
        if (ready) return;
        const y = e.nativeEvent.layout.y;
        setAnchorY(y);
        offsetRef.current = Math.max(0, y - 8);
        setReady(true);
      }}
    >
      <Text style={sectionTitle}>Assistir a seguir</Text>
      {sortedNext.length === 0 ? (
        <Text style={{ fontSize: 13, color: "#A8A8B0" }}>Nada em andamento.</Text>
      ) : (
        sortedNext.map((c) => (
          <TrackCard
            key={c.item.id}
            item={c.item}
            epTitle={c.epTitle}
            totalEps={c.totalEps}
            watchedCount={c.watched}
            displayEpisode={c.displayEpisode}
            nextSeason={c.nextSeason ?? undefined}
            nextEpisode={c.nextEpisode ?? undefined}
            seasonNumber={c.nextSeason ?? c.item.current_season}
            onUpdated={load}
          />
        ))
      )}
    </View>
  );

  const stalledSection = (
    <View style={{ gap: 14, marginTop: 24 }}>
      <Text style={sectionTitle}>Sem atualizar há +1 mês</Text>
      {stalled.length === 0 ? (
        <Text style={{ fontSize: 13, color: "#A8A8B0" }}>Nenhuma série parada há mais de 1 mês.</Text>
      ) : (
        stalled.map((c) => (
          <View key={c.item.id} style={{ opacity: 0.82 }}>
            <TrackCard
              item={c.item}
              epTitle={c.epTitle}
              totalEps={c.totalEps}
              watchedCount={c.watched}
              displayEpisode={c.displayEpisode}
              nextSeason={c.nextSeason ?? undefined}
              nextEpisode={c.nextEpisode ?? undefined}
              seasonNumber={c.nextSeason ?? c.item.current_season}
              onUpdated={load}
            />
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B0E" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#F5F5F7" }}>Assistindo</Text>
        <TouchableOpacity onPress={() => setShowSort(true)} style={{ padding: 4 }}>
          <Ionicons name="options-outline" size={26} color="#A8A8B0" />
        </TouchableOpacity>
      </View>

      {hasAny ? (
        <ScrollView
          ref={scrollRef}
          key={ready ? "anchored" : "measure"}
          contentOffset={ready && anchorY != null ? { x: 0, y: Math.max(0, anchorY - 8) } : undefined}
          style={{ flex: 1 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onContentSizeChange={onContentSizeChange}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 560, opacity: ready ? 1 : 0 }}
          showsVerticalScrollIndicator={false}
        >
          {history.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              {loadingMore && <ActivityIndicator color="#F24E4E" style={{ marginBottom: 12 }} />}
              <Text style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.4, color: "#6A6A72" }}>
                HISTÓRICO
              </Text>
              {history.map((c) => (
                <View
                  key={`${c.item.tmdb_id}-${c.item.current_season}-${c.item.current_episode}`}
                  style={{ opacity: 0.58, marginTop: 14 }}
                >
                  <TrackCard
                    item={c.item}
                    epTitle={c.epTitle}
                    totalEps={c.totalEps}
                    watchedCount={c.watched}
                    displayEpisode={c.displayEpisode}
                    seasonNumber={c.item.current_season}
                    hideCheck
                  />
                </View>
              ))}
            </View>
          )}

          {nextSection}
          {stalledSection}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: "center", paddingVertical: 64, paddingHorizontal: 32, gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#F5F5F7" }}>Nada para assistir</Text>
          <Text style={{ fontSize: 14, color: "#A8A8B0", textAlign: "center", maxWidth: 260 }}>
            Busque e adicione uma série ou anime para começar.
          </Text>
        </View>
      )}

      <Modal visible={showSort} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => setShowSort(false)}>
          <View style={{ backgroundColor: "#161619", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 8, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#F5F5F7", marginBottom: 12 }}>Ordenar por</Text>
            {(Object.keys(sortLabels) as SortMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => { setSortMode(mode); setShowSort(false); }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 }}
              >
                <Text style={{ fontSize: 16, color: sortMode === mode ? "#F24E4E" : "#F5F5F7" }}>{sortLabels[mode]}</Text>
                {sortMode === mode && <Ionicons name="checkmark" size={20} color="#F24E4E" />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
