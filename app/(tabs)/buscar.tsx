import { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Poster from "@/components/poster";
import { addToLibrary, listLibrary } from "@/lib/library";
import { tmdb } from "@/lib/tmdb";
import type { TmdbSearchResult } from "@/lib/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENTS_KEY = "watchtv:recent-searches";

export default function BuscarScreen() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [explore, setExplore] = useState<any>(null);
  const [libIds, setLibIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(RECENTS_KEY).then((v) => {
      if (v) setRecents(JSON.parse(v));
    });
    tmdb.trending().then((d) => setExplore({ trending: d.results })).catch(() => {});
    tmdb.popularMovies().then((d) => setExplore((p: any) => p ? { ...p, movies: d.results } : null)).catch(() => {});
    tmdb.popularTv().then((d) => setExplore((p: any) => p ? { ...p, tv: d.results } : null)).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => {
    listLibrary().then((items) => {
      setLibIds(new Set(items.map((i) => `${i.tmdb_id}-${i.media_type}`)));
    });
  }, []));

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      return;
    }
    setSearching(true);
    tmdb.searchMulti(debounced)
      .then((d) => setResults(d.results.filter((r) => r.media_type === "tv" || r.media_type === "movie")))
      .finally(() => setSearching(false));
  }, [debounced]);

  const filtered = results;

  function saveRecent(term: string) {
    if (!term) return;
    const next = [term, ...recents.filter((r) => r !== term)].slice(0, 6);
    setRecents(next);
    AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0B0B0E" }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 16, gap: 16 }}>
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#F5F5F7" }}>Buscar</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#161619", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A30" }}>
          <Ionicons name="search" size={18} color="#6A6A72" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Séries, filmes, animes…"
            placeholderTextColor="#6A6A72"
            returnKeyType="search"
            onSubmitEditing={() => saveRecent(q)}
            style={{ flex: 1, color: "#F5F5F7", fontSize: 14 }}
          />
        </View>
      </View>

      {debounced ? (
        searching ? (
          <ActivityIndicator size="large" color="#F24E4E" />
        ) : filtered.length === 0 ? (
          <Text style={{ color: "#A8A8B0", fontSize: 14, textAlign: "center", paddingVertical: 32 }}>
            Nenhum resultado para &quot;{debounced}&quot;.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((r) => {
              const title = r.name ?? r.title ?? "—";
              const date = r.release_date ?? r.first_air_date ?? null;
              const inLib = libIds.has(`${r.id}-${r.media_type}`);
              return (
                <View key={`${r.media_type}-${r.id}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, backgroundColor: "#161619", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A30" }}>
                  <View style={{ width: 44, height: 66, flexShrink: 0 }}>
                    <Poster path={r.poster_path} alt={title} size="w92" style={{ width: "100%", height: "100%" }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#F5F5F7" }} numberOfLines={1}>{title}</Text>
                    <Text style={{ fontSize: 12, color: "#6A6A72" }}>
                      {date ? date.slice(0, 4) : "—"} · {r.media_type === "tv" ? "Série" : "Filme"}
                    </Text>
                  </View>
                  {inLib ? (
                    <TouchableOpacity onPress={() => router.push(`/titulo/${r.id}`)}>
                      <Ionicons name="information-circle-outline" size={20} color="#6A6A72" />
                    </TouchableOpacity>
                  ) : (
                    <AddButton r={r} onAdded={() => {
                      setLibIds((p) => new Set(p).add(`${r.id}-${r.media_type}`));
                    }} />
                  )}
                </View>
              );
            })}
          </View>
        )
      ) : (
        <>
          {explore && (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6A6A72" }}>EXPLORAR</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <ExploreCard label="Trending" icon="flame" data={explore.trending} />
                <ExploreCard label="Populares" icon="bar-chart" data={explore.movies} />
                <ExploreCard label="Originais" icon="star" data={explore.tv} />
                <ExploreCard label="Animes" icon="sparkles" data={explore.tv} />
              </View>
            </View>
          )}

          {recents.length > 0 && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6A6A72" }}>BUSCAS RECENTES</Text>
                <TouchableOpacity onPress={() => { setRecents([]); AsyncStorage.removeItem(RECENTS_KEY); }}>
                  <Text style={{ fontSize: 12, color: "#6A6A72" }}>Limpar</Text>
                </TouchableOpacity>
              </View>
              {recents.map((r) => (
                <TouchableOpacity key={r} onPress={() => setQ(r)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#161619", borderRadius: 10 }}>
                  <Ionicons name="time-outline" size={14} color="#6A6A72" />
                  <Text style={{ fontSize: 13, fontWeight: "500", color: "#F5F5F7", flex: 1 }} numberOfLines={1}>{r}</Text>
                  <Ionicons name="arrow-undo" size={14} color="#6A6A72" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  function ExploreCard({ label, icon, data }: { label: string; icon: string; data: TmdbSearchResult[] }) {
    return (
      <TouchableOpacity
        onPress={() => setExplore((p: any) => ({ ...p, view: label, items: data }))}
        style={{ width: "48%", height: 72, padding: 12, justifyContent: "space-between", backgroundColor: "#161619", borderRadius: 10, borderWidth: 1, borderColor: "#2A2A30" }}
      >
        <Ionicons name={icon as any} size={18} color="#F24E4E" />
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#F5F5F7" }}>{label}</Text>
      </TouchableOpacity>
    );
  }
}

function AddButton({ r, onAdded }: { r: TmdbSearchResult; onAdded?: () => void }) {
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const title = r.name ?? r.title ?? "—";
  return (
    <TouchableOpacity
      onPress={async () => {
        if (busy) return;
        setBusy(true);
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
          onAdded?.();
        } catch {}
        setBusy(false);
      }}
      disabled={added || busy}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: added ? "rgba(91,214,143,0.2)" : "#F24E4E",
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "600", color: added ? "#5BD68F" : "#F5F5F7" }}>
        {added ? "Adicionado" : busy ? "…" : "Adicionar"}
      </Text>
    </TouchableOpacity>
  );
}