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
  markSeasonWatched,
  unmarkEpisode,
  markEpisode,
  rewatchEpisode,
  addToLibrary,
} from "@/lib/library";
import type { LibraryItem, WatchedEpisode, TmdbTv, TmdbMovie, TmdbSeason, MediaType, MediaStatus } from "@/lib/types";
import { tmdb } from "@/lib/tmdb";
import { backdropUrl, posterUrl } from "@/lib/tmdb-config";
import { getRatingsForTitle, setRating, clearRating, ratingKey, TITLE_SEASON, TITLE_EPISODE } from "@/lib/ratings";
import { deriveProgress, PROGRESS } from "@/lib/progress";
import EpisodeRow from "@/components/episode-row";
import EpisodeDetailModal from "@/components/episode-detail-modal";
import StarRating from "@/components/star-rating";
import ScalePressable from "@/components/scale-pressable";

export default function TituloScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tmdbId = Number(id);
  const [libItem, setLibItem] = useState<LibraryItem | null>(null);
  const [tv, setTv] = useState<TmdbTv | null>(null);
  const [movie, setMovie] = useState<TmdbMovie | null>(null);
  const [seasons, setSeasons] = useState<Record<number, TmdbSeason>>({});
  const [seasonLoading, setSeasonLoading] = useState<Record<number, boolean>>({});
  const [markingSeason, setMarkingSeason] = useState<number | null>(null);
  const [watchedMap, setWatchedMap] = useState<Record<string, WatchedEpisode>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [epModal, setEpModal] = useState<{ season: number; episode: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const mediaType: MediaType = tv ? "tv" : "movie";

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
        const s = item.current_season;
        try {
          const [seasonData, watched] = await Promise.all([
            tmdb.tvSeason(tmdbId, s),
            listWatched(item.id, s),
          ]);
          if (!active) return;
          const wmap: Record<string, WatchedEpisode> = {};
          for (const w of watched) wmap[`${w.season}-${w.episode}`] = w;
          setSeasons((prev) => ({ ...prev, [s]: seasonData }));
          setWatchedMap(wmap);
          setExpandedSeason(s);
        } catch {
          if (active) setExpandedSeason(null);
        }
        getRatingsForTitle(tmdbId, "tv").then((r) => { if (active) setRatings(r); });
      } else if (item && item.media_type === "movie") {
        const data = await tmdb.movie(tmdbId);
        if (!active) return;
        setMovie(data);
        setLibItem(item);
        getRatingsForTitle(tmdbId, "movie").then((r) => { if (active) setRatings(r); });
      } else {
        const tvR = await tmdb.tv(tmdbId).catch(() => null);
        if (tvR && active) {
          setTv(tvR);
          getRatingsForTitle(tmdbId, "tv").then((r) => { if (active) setRatings(r); });
        } else {
          const mR = await tmdb.movie(tmdbId).catch(() => null);
          if (mR && active) {
            setMovie(mR);
            getRatingsForTitle(tmdbId, "movie").then((r) => { if (active) setRatings(r); });
          }
        }
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [tmdbId]);

  async function loadSeason(s: number, libraryId: string): Promise<boolean> {
    setSeasonLoading((prev) => ({ ...prev, [s]: true }));
    try {
      const [data, watched] = await Promise.all([
        tmdb.tvSeason(tmdbId, s),
        listWatched(libraryId, s),
      ]);
      setSeasons((prev) => ({ ...prev, [s]: data }));
      setWatchedMap((prev) => {
        const next = { ...prev };
        for (const w of watched) next[`${w.season}-${w.episode}`] = w;
        return next;
      });
      return true;
    } catch {
      Alert.alert("Erro", "Não foi possível carregar os episódios desta temporada.");
      return false;
    } finally {
      setSeasonLoading((prev) => ({ ...prev, [s]: false }));
    }
  }

  async function expandSeason(s: number) {
    if (expandedSeason === s) {
      setExpandedSeason(null);
      return;
    }
    setExpandedSeason(s);
    if (seasons[s]) return;
    if (!libItem) return;
    const ok = await loadSeason(s, libItem.id);
    if (!ok) setExpandedSeason((cur) => (cur === s ? null : cur));
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

  async function onMarkSeason(s: number, episodeCount: number) {
    if (!libItem) return;
    setMarkingSeason(s);
    try {
      await markSeasonWatched(libItem.id, s, episodeCount);
      await reloadWatched(s);
      const items = await listLibrary();
      setLibItem(items.find((i) => i.tmdb_id === tmdbId) ?? null);
    } catch {
      Alert.alert("Erro", "Não foi possível marcar a temporada. Verifique sua conexão.");
    } finally {
      setMarkingSeason(null);
    }
  }

  async function rateTitle(value: number) {
    const current = ratings[ratingKey(TITLE_SEASON, TITLE_EPISODE)] ?? 0;
    const nextValue = current === value ? 0 : value;
    setRatings((prev) => {
      const next = { ...prev };
      if (nextValue === 0) delete next[ratingKey(TITLE_SEASON, TITLE_EPISODE)];
      else next[ratingKey(TITLE_SEASON, TITLE_EPISODE)] = nextValue;
      return next;
    });
    try {
      if (nextValue === 0) await clearRating(tmdbId, mediaType, TITLE_SEASON, TITLE_EPISODE);
      else await setRating(tmdbId, mediaType, TITLE_SEASON, TITLE_EPISODE, nextValue);
    } catch {
      Alert.alert("Erro", "Não foi possível salvar a avaliação. Rode o supabase/ratings.sql no Supabase.");
    }
  }

  async function rateEpisode(season: number, episode: number, value: number) {
    const key = ratingKey(season, episode);
    const current = ratings[key] ?? 0;
    const nextValue = current === value ? 0 : value;
    setRatings((prev) => {
      const next = { ...prev };
      if (nextValue === 0) delete next[key];
      else next[key] = nextValue;
      return next;
    });
    try {
      if (nextValue === 0) await clearRating(tmdbId, mediaType, season, episode);
      else await setRating(tmdbId, mediaType, season, episode, nextValue);
    } catch {
      Alert.alert("Erro", "Não foi possível salvar a avaliação. Rode o supabase/ratings.sql no Supabase.");
    }
  }

  async function toggleEpisodeWatched(season: number, episode: number, isWatched: boolean) {
    if (!libItem) return;
    try {
      if (isWatched) await unmarkEpisode(libItem.id, season, episode);
      else await markEpisode(libItem.id, season, episode, tmdbId);
      await reloadWatched(season);
      const items = await listLibrary();
      setLibItem(items.find((i) => i.tmdb_id === tmdbId) ?? null);
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o episódio.");
    }
  }

  async function refreshLibItem() {
    const items = await listLibrary();
    setLibItem(items.find((i) => i.tmdb_id === tmdbId) ?? null);
  }

  async function addNow(status: MediaStatus) {
    await addToLibrary(
      isMovie
        ? {
            tmdb_id: tmdbId,
            media_type: "movie",
            status,
            title: movie?.title ?? "",
            poster_path: movie?.poster_path ?? null,
            backdrop_path: movie?.backdrop_path ?? null,
            release_date: movie?.release_date ?? null,
          }
        : {
            tmdb_id: tmdbId,
            media_type: "tv",
            status,
            title: tv?.name ?? "",
            poster_path: tv?.poster_path ?? null,
            backdrop_path: tv?.backdrop_path ?? null,
            release_date: tv?.first_air_date ?? null,
            total_seasons: tv?.number_of_seasons ?? null,
          },
    );
    await refreshLibItem();
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
  const titleRating = ratings[ratingKey(TITLE_SEASON, TITLE_EPISODE)] ?? 0;
  const tvProgress = tv && libItem ? deriveProgress(libItem, tv) : null;

  const modalEp =
    epModal && seasons[epModal.season]?.episodes?.find((e) => e.episode_number === epModal.episode);
  const modalWatched = epModal ? !!watchedMap[`${epModal.season}-${epModal.episode}`] : false;

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B0E" }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ height: 280, backgroundColor: "#1F1F24" }}>
          {backdrop ? (
            <Image
              source={(() => {
                const src = backdropUrl(backdrop, "w780");
                return typeof src === "number" ? src : { uri: src ?? "" };
              })()}
              style={{ width: "100%", height: "100%" }}
            />
          ) : null}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <ScalePressable
              onPress={async () => {
                if (libItem) {
                  await removeFromLibrary(libItem.id);
                  await refreshLibItem();
                } else {
                  await addNow(isMovie ? "planned" : "watching");
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: !!libItem }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
                backgroundColor: libItem ? "#F24E4E" : "transparent",
                borderWidth: 1, borderColor: libItem ? "#F24E4E" : "#3A3A42",
              }}
            >
              <Ionicons name={libItem ? "checkmark" : "bookmark-outline"} size={15} color={libItem ? "#F5F5F7" : "#F24E4E"} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: libItem ? "#F5F5F7" : "#F24E4E" }}>Minha lista</Text>
            </ScalePressable>

            {libItem && isMovie && (
              <ScalePressable
                onPress={async () => {
                  if (libItem.status === "completed") await setStatus(libItem.id, "planned");
                  else await markMovieWatched(libItem.id, tmdbId);
                  await refreshLibItem();
                }}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
                  backgroundColor: libItem.status === "completed" ? "#1F1F24" : "#F24E4E",
                  borderWidth: 1, borderColor: libItem.status === "completed" ? "#2A2A30" : "#F24E4E",
                }}
              >
                <Ionicons name="checkmark" size={15} color={libItem.status === "completed" ? "#5BD68F" : "#F5F5F7"} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: libItem.status === "completed" ? "#5BD68F" : "#F5F5F7" }}>
                  {libItem.status === "completed" ? "Visto" : "Marcar visto"}
                </Text>
              </ScalePressable>
            )}

            {libItem && !isMovie && tvProgress && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: "#1F1F24", borderWidth: 1, borderColor: "#2A2A30" }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: PROGRESS[tvProgress].color }} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: PROGRESS[tvProgress].color }}>
                  {PROGRESS[tvProgress].label}
                </Text>
              </View>
            )}

            {libItem && !isMovie && (
              <ScalePressable
                onPress={async () => {
                  await setStatus(libItem.id, libItem.status === "dropped" ? "watching" : "dropped");
                  await refreshLibItem();
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: "#1F1F24", borderWidth: 1, borderColor: "#2A2A30" }}
              >
                <Ionicons name={libItem.status === "dropped" ? "refresh" : "ban"} size={14} color="#A8A8B0" />
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#A8A8B0" }}>
                  {libItem.status === "dropped" ? "Retomar" : "Abandonar"}
                </Text>
              </ScalePressable>
            )}
          </View>

          <View style={{ gap: 6, padding: 12, backgroundColor: "#161619", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A30" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.4, color: "#6A6A72" }}>SUA AVALIAÇÃO</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <StarRating value={titleRating} onChange={rateTitle} />
              {titleRating > 0 && <Text style={{ fontSize: 13, color: "#A8A8B0" }}>{titleRating.toFixed(1)}</Text>}
            </View>
          </View>

          {overview ? (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.4, color: "#6A6A72" }}>SINOPSE</Text>
              <Text style={{ fontSize: 14, color: "#A8A8B0", lineHeight: 20 }}>{overview}</Text>
            </View>
          ) : null}

          {credits && credits.cast.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.4, color: "#6A6A72" }}>ELENCO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {credits.cast.slice(0, 8).map((c) => (
                  <View key={c.id} style={{ width: 56, gap: 4, alignItems: "center" }}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#1F1F24", overflow: "hidden" }}>
                      {c.profile_path && (
                        <Image
                          source={(() => {
                            const src = posterUrl(c.profile_path, "w92");
                            return typeof src === "number" ? src : { uri: src ?? "" };
                          })()}
                          style={{ width: "100%", height: "100%" }}
                        />
                      )}
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#F5F5F7", textAlign: "center" }} numberOfLines={1}>{c.name.split(" ")[0]}</Text>
                    <Text style={{ fontSize: 10, color: "#6A6A72", textAlign: "center" }} numberOfLines={1}>{c.character}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {isMovie && libItem && libItem.status === "completed" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#161619", borderRadius: 10 }}>
              <Ionicons name="checkmark-circle" size={16} color="#5BD68F" />
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#A8A8B0" }}>
                Visto {libItem.runtime_minutes ? `· ${Math.floor(libItem.runtime_minutes / 60)}h ${libItem.runtime_minutes % 60}min` : ""}
              </Text>
              <ScalePressable
                onPress={async () => {
                  await rewatchMovie(libItem.id);
                  await refreshLibItem();
                }}
                style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#1F1F24", borderWidth: 1, borderColor: "#2A2A30" }}
              >
                <Ionicons name="refresh" size={14} color="#F24E4E" />
                <Text style={{ fontSize: 13, fontWeight: "500", color: "#F24E4E" }}>Revisto</Text>
              </ScalePressable>
            </View>
          ) : null}

          {tv ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.4, color: "#6A6A72" }}>TEMPORADAS</Text>
              {tv.seasons.filter((s) => s.season_number > 0).map((s) => {
                const expanded = expandedSeason === s.season_number;
                const isLoading = seasonLoading[s.season_number];
                return (
                  <View key={s.season_number} style={{ borderRadius: 10, backgroundColor: "#161619", borderWidth: 1, borderColor: expanded ? "#F24E4E55" : "#2A2A30", overflow: "hidden" }}>
                    <TouchableOpacity
                      onPress={() => expandSeason(s.season_number)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}
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
                      <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#6A6A72" />
                    </TouchableOpacity>

                    {expanded && (
                      <View style={{ borderTopWidth: 1, borderTopColor: "#2A2A30" }}>
                        {isLoading || !seasons[s.season_number] ? (
                          <View style={{ paddingVertical: 24 }}>
                            <ActivityIndicator color="#F24E4E" />
                          </View>
                        ) : (
                          <>
                            <ScalePressable
                              onPress={() => onMarkSeason(s.season_number, s.episode_count)}
                              disabled={markingSeason === s.season_number}
                              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: "#1F1F24", borderWidth: 1, borderColor: "#2A2A30" }}
                            >
                              {markingSeason === s.season_number ? (
                                <ActivityIndicator size="small" color="#F24E4E" />
                              ) : (
                                <>
                                  <Ionicons name="checkmark-done" size={16} color="#F24E4E" />
                                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#F24E4E" }}>Marcar temporada como assistida</Text>
                                </>
                              )}
                            </ScalePressable>
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
                                  rating={ratings[ratingKey(s.season_number, ep.episode_number)]}
                                  onUpdated={() => reloadWatched(s.season_number)}
                                  onOpen={() => setEpModal({ season: s.season_number, episode: ep.episode_number })}
                                />
                              );
                            })}
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <EpisodeDetailModal
        visible={!!modalEp}
        onClose={() => setEpModal(null)}
        showTitle={title}
        season={epModal?.season ?? 1}
        episode={epModal?.episode ?? 1}
        name={modalEp?.name ?? ""}
        overview={modalEp?.overview ?? ""}
        runtime={modalEp?.runtime ?? null}
        airDate={modalEp?.air_date ?? null}
        stillPath={modalEp?.still_path ?? null}
        watched={modalWatched}
        watchCount={epModal ? watchedMap[`${epModal.season}-${epModal.episode}`]?.watch_count ?? 0 : 0}
        rating={epModal ? ratings[ratingKey(epModal.season, epModal.episode)] ?? 0 : 0}
        onToggleWatched={() => {
          if (!epModal) return;
          toggleEpisodeWatched(epModal.season, epModal.episode, modalWatched);
        }}
        onRewatch={async () => {
          if (!epModal || !libItem) return;
          await rewatchEpisode(libItem.id, epModal.season, epModal.episode);
          await reloadWatched(epModal.season);
        }}
        onRate={(v) => {
          if (!epModal) return;
          rateEpisode(epModal.season, epModal.episode, v);
        }}
      />
    </View>
  );
}
