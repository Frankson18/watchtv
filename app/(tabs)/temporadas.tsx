import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Poster from "@/components/poster";
import ScalePressable from "@/components/scale-pressable";
import { listLibrary } from "@/lib/library";
import { tmdb } from "@/lib/tmdb";
import { deriveProgress, hasNewSeason, PROGRESS, type ProgressState } from "@/lib/progress";
import type { LibraryItem, TmdbTv } from "@/lib/types";

type TypeFilter = "all" | "tv" | "movie";
type StatusFilter = "all" | "planned" | "watching" | "up_to_date" | "completed";

const TYPES: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "tv", label: "Séries" },
  { key: "movie", label: "Filmes" },
];

const STATUSES: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "planned", label: "Para ver" },
  { key: "watching", label: "Assistindo" },
  { key: "up_to_date", label: "Em dia" },
  { key: "completed", label: "Concluídas" },
];

interface Row {
  item: LibraryItem;
  state: ProgressState;
  badge: boolean;
}

const tvCache = new Map<number, TmdbTv | null>();

async function getTv(tmdbId: number): Promise<TmdbTv | null> {
  if (!tvCache.has(tmdbId)) {
    try {
      tvCache.set(tmdbId, await tmdb.tv(tmdbId));
    } catch {
      tvCache.set(tmdbId, null);
    }
  }
  return tvCache.get(tmdbId) ?? null;
}

function metaFor(it: LibraryItem): string {
  if (it.media_type === "tv") {
    if (it.current_episode > 0) return `T${it.current_season} · E${it.current_episode}`;
    return it.release_date?.slice(0, 4) ?? "—";
  }
  const year = it.release_date?.slice(0, 4) ?? "—";
  if (it.runtime_minutes) {
    const h = Math.floor(it.runtime_minutes / 60);
    const m = it.runtime_minutes % 60;
    return m > 0 ? `${year} · ${h}h ${m}min` : `${year} · ${h}h`;
  }
  return year;
}

export default function MinhaListaScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const load = useCallback(async () => {
    const items = await listLibrary();
    const enriched = await Promise.all(
      items.map(async (it): Promise<Row> => {
        if (it.media_type === "movie") {
          const completed = it.status === "completed";
          return {
            item: it,
            state: completed ? "completed" : "planned",
            badge: false,
          };
        }
        const tv = await getTv(it.tmdb_id);
        return { item: it, state: deriveProgress(it, tv), badge: hasNewSeason(it, tv) };
      }),
    );
    setRows(enriched);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = rows.filter(
    (r) =>
      (type === "all" || r.item.media_type === type) &&
      (status === "all" || r.state === status),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0B0B0E" }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 24, gap: 16 }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#F5F5F7" }}>Minha lista</Text>
        <Text style={{ fontSize: 13, color: "#A8A8B0" }}>Séries e filmes em um só lugar</Text>
      </View>

      <View style={{ flexDirection: "row", backgroundColor: "#1F1F24", borderRadius: 999, padding: 4, gap: 4 }}>
        {TYPES.map((t) => {
          const active = type === t.key;
          return (
            <ScalePressable
              key={t.key}
              onPress={() => setType(t.key)}
              style={{
                flex: 1,
                height: 34,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? "#F24E4E" : "transparent",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: active ? "600" : "500", color: active ? "#F5F5F7" : "#A8A8B0" }}>
                {t.label}
              </Text>
            </ScalePressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {STATUSES.map((s) => {
          const active = status === s.key;
          return (
            <ScalePressable
              key={s.key}
              onPress={() => setStatus(s.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: active ? "#F24E4E" : "#161619",
                borderWidth: 1,
                borderColor: active ? "#F24E4E" : "#2A2A30",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: active ? "600" : "500", color: active ? "#F5F5F7" : "#A8A8B0" }}>
                {s.label}
              </Text>
            </ScalePressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#F24E4E" style={{ marginTop: 32 }} />
      ) : filtered.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 56, gap: 8 }}>
          <Ionicons name="albums-outline" size={28} color="#6A6A72" />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#F5F5F7" }}>Nada por aqui</Text>
          <Text style={{ fontSize: 13, color: "#A8A8B0", textAlign: "center", maxWidth: 240 }}>
            {rows.length === 0
              ? "Busque e adicione uma série ou filme para começar."
              : "Nenhum item neste filtro."}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map(({ item, state, badge }) => {
            const st = PROGRESS[state];
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/titulo/${item.tmdb_id}`)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, backgroundColor: "#161619", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A30" }}
              >
                <View style={{ width: 50, height: 74, flexShrink: 0 }}>
                  <Poster path={item.poster_path} alt={item.title} size="w92" style={{ width: "100%", height: "100%" }} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#F5F5F7" }} numberOfLines={1}>{item.title}</Text>
                  <Text style={{ fontSize: 12, color: "#A8A8B0" }}>{metaFor(item)}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: st.color }} />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: st.color }}>
                      {item.media_type === "movie" ? (state === "completed" ? "Visto" : "Para ver") : st.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#6A6A72" }}>· {item.media_type === "tv" ? "Série" : "Filme"}</Text>
                    {badge && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: "#7E2828" }}>
                        <Ionicons name="sparkles" size={10} color="#F24E4E" />
                        <Text style={{ fontSize: 10, fontWeight: "600", color: "#F24E4E" }}>Nova temporada</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#6A6A72" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
