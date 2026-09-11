import { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Poster from "@/components/poster";
import ScalePressable from "@/components/scale-pressable";
import { addToLibrary, listLibrary, removeFromLibrary } from "@/lib/library";
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
  const [exploreSel, setExploreSel] = useState<{ label: string; items: TmdbSearchResult[] } | null>(null);
  const [libMap, setLibMap] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(RECENTS_KEY).then((v) => {
      if (v) setRecents(JSON.parse(v));
    });
    (async () => {
      const [tr, pm, pt] = await Promise.allSettled([
        tmdb.trending(),
        tmdb.popularMovies(),
        tmdb.popularTv(),
      ]);
      setExplore({
        trending: tr.status === "fulfilled" ? tr.value.results : [],
        movies: pm.status === "fulfilled" ? pm.value.results : [],
        tv: pt.status === "fulfilled" ? pt.value.results : [],
      });
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    listLibrary().then((items) => {
      const m: Record<string, string> = {};
      for (const i of items) m[`${i.tmdb_id}-${i.media_type}`] = i.id;
      setLibMap(m);
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

  async function toggleLib(r: TmdbSearchResult) {
    const key = `${r.id}-${r.media_type}`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      const libId = libMap[key];
      if (libId) {
        await removeFromLibrary(libId);
        setLibMap((prev) => {
          const n = { ...prev };
          delete n[key];
          return n;
        });
      } else {
        const title = r.name ?? r.title ?? "—";
        const added = await addToLibrary({
          tmdb_id: r.id,
          media_type: r.media_type as "tv" | "movie",
          status: r.media_type === "movie" ? "planned" : "watching",
          title,
          poster_path: r.poster_path,
          backdrop_path: r.backdrop_path,
          release_date: r.release_date ?? r.first_air_date ?? null,
        });
        if (added?.id) setLibMap((prev) => ({ ...prev, [key]: added.id }));
      }
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar sua lista.");
    } finally {
      setBusyKey(null);
    }
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
              const key = `${r.id}-${r.media_type}`;
              return (
                <ResultRow
                  key={`${r.media_type}-${r.id}`}
                  r={r}
                  inLib={!!libMap[key]}
                  busy={busyKey === key}
                  onToggle={() => toggleLib(r)}
                />
              );
            })}
          </View>
        )
      ) : (
        <>
          {explore && (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6A6A72" }}>EXPLORAR</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <ExploreCard label="Em alta" icon="flame" data={explore.trending} />
                <ExploreCard label="Filmes" icon="film" data={explore.movies} />
                <ExploreCard label="Séries" icon="tv" data={explore.tv} />
              </View>
            </View>
          )}

          {exploreSel && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6A6A72" }}>{exploreSel.label.toUpperCase()}</Text>
                <TouchableOpacity onPress={() => setExploreSel(null)}>
                  <Text style={{ fontSize: 12, color: "#6A6A72" }}>Fechar</Text>
                </TouchableOpacity>
              </View>
              <View style={{ gap: 10 }}>
                {(exploreSel.items ?? []).slice(0, 12).map((r) => {
                  const key = `${r.id}-${r.media_type}`;
                  return (
                    <ResultRow
                      key={`${r.media_type}-${r.id}`}
                      r={r}
                      inLib={!!libMap[key]}
                      busy={busyKey === key}
                      onToggle={() => toggleLib(r)}
                    />
                  );
                })}
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
    const active = exploreSel?.label === label;
    return (
      <ScalePressable
        onPress={() => setExploreSel((prev) => (prev?.label === label ? null : { label, items: data ?? [] }))}
        style={{
          flex: 1,
          height: 72,
          padding: 12,
          justifyContent: "space-between",
          backgroundColor: active ? "#241518" : "#161619",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: active ? "#F24E4E" : "#2A2A30",
        }}
      >
        <Ionicons name={icon as any} size={18} color="#F24E4E" />
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#F5F5F7" }}>{label}</Text>
      </ScalePressable>
    );
  }
}

function ResultRow({
  r,
  inLib,
  busy,
  onToggle,
}: {
  r: TmdbSearchResult;
  inLib: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const title = r.name ?? r.title ?? "—";
  const date = r.release_date ?? r.first_air_date ?? null;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/titulo/${r.id}`)}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, backgroundColor: "#161619", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A30" }}
    >
      <View style={{ width: 44, height: 66, flexShrink: 0 }}>
        <Poster path={r.poster_path} alt={title} size="w92" style={{ width: "100%", height: "100%" }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#F5F5F7" }} numberOfLines={1}>{title}</Text>
        <Text style={{ fontSize: 12, color: "#6A6A72" }}>
          {date ? date.slice(0, 4) : "—"} · {r.media_type === "tv" ? "Série" : "Filme"}
        </Text>
      </View>
      <LibToggle r={r} inLib={inLib} busy={busy} onToggle={onToggle} />
    </TouchableOpacity>
  );
}

function LibToggle({
  r,
  inLib,
  busy,
  onToggle,
}: {
  r: TmdbSearchResult;
  inLib: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const label = "Minha lista";
  return (
    <ScalePressable
      onPress={(e) => {
        e?.stopPropagation?.();
        onToggle();
      }}
      disabled={busy}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityState={{ selected: inLib }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: inLib ? "#F24E4E" : "transparent",
        borderWidth: 1,
        borderColor: inLib ? "#F24E4E" : "#3A3A42",
        opacity: busy ? 0.5 : 1,
      }}
    >
      <Ionicons
        name={inLib ? "checkmark" : "bookmark-outline"}
        size={13}
        color={inLib ? "#F5F5F7" : "#F24E4E"}
      />
      <Text style={{ fontSize: 12, fontWeight: "600", color: inLib ? "#F5F5F7" : "#F24E4E" }}>
        {label}
      </Text>
    </ScalePressable>
  );
}