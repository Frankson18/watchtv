import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  markMovieWatched,
  rewatchMovie,
  removeFromLibrary,
  setStatus,
  listWatched,
  listLibrary,
} from "@/lib/library";
import type { LibraryItem, WatchedEpisode, TmdbTv, TmdbMovie, TmdbSeason } from "@/lib/types";
import { tmdb } from "@/lib/tmdb";
import { backdropUrl, posterUrl } from "@/lib/tmdb-config";
import EpisodeRow from "@/components/episode-row";

export default function TituloScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tmdbId = Number(id);
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
        const data = await tmdb.tv(tmdbId);
        if (!active) return;
        setTv(data);
        setLibItem(item);
        const watched = await listWatched(item.id, item.current_season);
        const wmap: Record<string, WatchedEpisode> = {};
        for (const w of watched) wmap[`${w.season}-${w.episode}`] = w;
        if (!active) return;
        setWatchedMap(wmap);
        setExpandedSeason(item.current_season);
      } else if (item && item.media_type === "movie") {
        const data = await tmdb.movie(tmdbId);
        if (!active) return;
        setMovie(data);
        setLibItem(item);
      } else {
        const tvR = await tmdb.tv(tmdbId).catch(() => null);
        if (tvR && active) {
          setTv(tvR);
        } else {
          const mR = await tmdb.movie(tmdbId).catch(() => null);
          if (mR && active) setMovie(mR);
        }
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [tmdbId]);

  async function expandSeason(s: number) {
    if (expandedSeason === s) {
      setExpandedSeason(null);
      return;
    }
    setExpandedSeason(s);
    if (seasons[s] || !tv) return;
    try {
      const data = await tmdb.tvSeason(tmdbId, s);
      setSeasons((prev) => ({ ...prev, [s]: data }));
      if (libItem) {
        const watched = await listWatched(libItem.id, s);
        setWatchedMap((prev) => {
          const next = { ...prev };
          for (const w of watched) next[`${w.season}-${w.episode}`] = w;
          return next;
        });
      }
    } catch {}
  }

  function countWatchedInSeason(s: number): number {
    return Object.values(watchedMap).filter((w) => w.season === s).length;
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B0B0E" }}>
        <ActivityIndicator size="large" color="#F24E4E" />
      </View>
    );
  }

  const isMovie = !!movie && !tv;
  const title = tv?.name ?? movie?.title ?? "—";
  const meta = isMovie
    ? `${movie?.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}min` : ""} · ${movie?.release_date?.slice(0, 4) ?? ""}`
    : `${tv?.number_of_seasons ?? 0} temporadas · ${tv?.first_air_date?.slice(0, 4) ?? ""}`;
  const genres = tv?.genres ?? movie?.genres ?? [];
  const credits = tv?.credits ?? movie?.credits;
  const backdrop = isMovie ? movie?.backdrop_path : tv?.backdrop_path;
  const overview = tv?.overview ?? movie?.overview ?? "";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0B0B0E" }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ height: 280, backgroundColor: "#1F1F24" }}>
        {backdrop ? (
          <Image
            source={{ uri: backdropUrl(backdrop, "w780") ?? "" }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : null}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(11,11,14,0)" }} />
        <View
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            paddingTop: 50,
            paddingHorizontal: 16,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={26} color="#F5F5F7" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuOpen((v) => !v)} style={{ padding: 4 }}>
            <Ionicons name="ellipsis-vertical" size={24} color="#F5F5F7" />
          </TouchableOpacity>
        </View>
        {menuOpen && libItem && (
          <View style={{ position: "absolute", top: 90, right: 16, backgroundColor: "#161619", borderRadius: 10, borderWidth: 1, borderColor: "#2A2A30", paddingVertical: 8, width: 200 }}>
            <TouchableOpacity
              onPress={async () => {
                Alert.alert("Remover", "Remover da biblioteca?", [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Remover",
                    style: "destructive",
                    onPress: async () => {
                      await removeFromLibrary(libItem.id);
                      router.back();
                    },
                  },
                ]);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color="#6A6A72" />
              <Text style={{ fontSize: 14, color: "#A8A8B0" }}>Remover da biblioteca</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#F5F5F7" }}>{title}</Text>
          <Text style={{ fontSize: 13, color: "#A8A8B0" }}>{meta}</Text>
          {genres.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {genres.slice(0, 5).map((g) => (
                <View key={g.id} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(22,22,25,0.8)", borderWidth: 1, borderColor: "#2A2A30" }}>
                  <Text style={{ fontSize: 11, fontWeight: "500", color: "#A8A8B0" }}>{g.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
        {libItem && (
          <TouchableOpacity
            onPress={async () => {
              if (libItem.status === "watching") await setStatus(libItem.id, "completed");
              else if (libItem.status === "completed") await setStatus(libItem.id, "watching");
              const items = await listLibrary();
              setLibItem(items.find((i) => i.tmdb_id === tmdbId) ?? null);
            }}
            style={{ alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "#F24E4E" }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#F5F5F7" }}>
              {libItem.status === "watching" ? "Assistindo" : libItem.status === "completed" ? "Concluído" : "Adicionar"}
            </Text>
          </TouchableOpacity>
        )}

        {overview ? (
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#6A6A72" }}>SINOPSE</Text>
            <Text style={{ fontSize: 14, color: "#A8A8B0", lineHeight: 20 }}>{overview}</Text>
          </View>
        ) : null}

        {credits && credits.cast.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#6A6A72" }}>ELENCO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {credits.cast.slice(0, 8).map((c) => (
                <View key={c.id} style={{ width: 56, gap: 4, alignItems: "center" }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#1F1F24", overflow: "hidden" }}>
                    {c.profile_path && (
                      <Image source={{ uri: posterUrl(c.profile_path, "w92") ?? "" }} style={{ width: "100%", height: "100%" }} />
                    )}
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#F5F5F7", textAlign: "center" }} numberOfLines={1}>{c.name.split(" ")[0]}</Text>
                  <Text style={{ fontSize: 10, color: "#6A6A72", textAlign: "center" }} numberOfLines={1}>{c.character}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {isMovie && libItem ? (
          libItem.status === "completed" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#161619", borderRadius: 10 }}>
              <Ionicons name="checkmark-circle" size={16} color="#5BD68F" />
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#A8A8B0" }}>
                Visto {libItem.runtime_minutes ? `· ${Math.floor(libItem.runtime_minutes / 60)}h ${libItem.runtime_minutes % 60}min` : ""}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  await rewatchMovie(libItem.id);
                  const items = await listLibrary();
                  setLibItem(items.find((i) => i.tmdb_id === tmdbId) ?? null);
                }}
                style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#1F1F24", borderWidth: 1, borderColor: "#2A2A30" }}
              >
                <Ionicons name="refresh" size={14} color="#F24E4E" />
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#F24E4E" }}>Revisto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={async () => {
                await markMovieWatched(libItem.id, tmdbId);
                const items = await listLibrary();
                setLibItem(items.find((i) => i.tmdb_id === tmdbId) ?? null);
              }}
              style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F24E4E", alignItems: "center" }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#F5F5F7" }}>Marcar visto</Text>
            </TouchableOpacity>
          )
        ) : null}

        {tv ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#6A6A72" }}>TEMPORADAS</Text>
            {tv.seasons.filter((s) => s.season_number > 0).map((s) => (
              <View key={s.season_number}>
                <TouchableOpacity
                  onPress={() => expandSeason(s.season_number)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: "#161619", borderRadius: 10, borderWidth: 1, borderColor: "#2A2A30" }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#F5F5F7" }}>Temporada {s.season_number}</Text>
                    <Text style={{ fontSize: 12, color: "#A8A8B0" }}>{s.episode_count} eps · {s.air_date?.slice(0, 4) ?? ""}</Text>
                  </View>
                  <View style={{ width: 60, height: 4, borderRadius: 2, backgroundColor: "#2A2A30", overflow: "hidden" }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: "#F24E4E", width: `${s.episode_count ? Math.min(100, Math.round((countWatchedInSeason(s.season_number) / s.episode_count) * 100)) : 0}%` }} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6A6A72" }}>
                    {countWatchedInSeason(s.season_number)}/{s.episode_count}
                  </Text>
                  <Ionicons name={expandedSeason === s.season_number ? "chevron-up" : "chevron-down"} size={18} color="#6A6A72" />
                </TouchableOpacity>
                {expandedSeason === s.season_number && seasons[s.season_number] && (
                  <View style={{ marginTop: 4, borderTopWidth: 1, borderTopColor: "#2A2A30" }}>
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
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}