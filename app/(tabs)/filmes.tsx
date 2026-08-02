import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import Poster from "@/components/poster";
import { listLibrary, markMovieWatched } from "@/lib/library";
import type { LibraryItem } from "@/lib/types";

export default function FilmesScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await listLibrary({ mediaType: "movie" });
    setItems(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const paraVer = items.filter((it) => it.status === "watching" || it.status === "planned");
  const vistos = items.filter((it) => it.status === "completed");
  const futures = useMemo(
    () => items.filter((it) => (it.release_date ? new Date(it.release_date) > new Date() : false)),
    [items],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B0B0E" }}>
        <ActivityIndicator size="large" color="#F24E4E" />
      </View>
    );
  }

  function Section({ title, count, data }: { title: string; count: number; data: LibraryItem[] }) {
    return (
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#F5F5F7" }}>{title}</Text>
          <Text style={{ fontSize: 12, color: "#6A6A72" }}>{count}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {data.length === 0 ? (
            <View style={{ flex: 1, height: 160, borderRadius: 8, backgroundColor: "rgba(22,22,25,0.5)", borderWidth: 1, borderColor: "#2A2A30", borderStyle: "dashed", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 14, color: "#A8A8B0", textAlign: "center" }}>Nenhum filme aqui.</Text>
            </View>
          ) : (
            data.map((it) => (
              <TouchableOpacity
                key={it.id}
                onPress={() => router.push(`/titulo/${it.tmdb_id}`)}
                style={{ width: 108, gap: 6 }}
              >
                <View style={{ width: 108, height: 162 }}>
                  <Poster path={it.poster_path} alt={it.title} size="w185" style={{ width: "100%", height: "100%" }} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#F5F5F7" }} numberOfLines={1}>{it.title}</Text>
                <Text style={{ fontSize: 11, color: "#6A6A72" }}>{it.release_date?.slice(0, 4) ?? "—"}</Text>
                {it.status !== "completed" ? (
                  <TouchableOpacity
                    onPress={async () => {
                      await markMovieWatched(it.id, it.tmdb_id);
                      load();
                    }}
                    style={{ marginTop: 4 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#F24E4E" }}>Marcar visto</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#5BD68F", marginTop: 4 }}>Visto</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0B0B0E" }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 16, gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#F5F5F7" }}>Filmes</Text>
        <Text style={{ fontSize: 13, color: "#A8A8B0" }}>Sua lista de filmes por embarque</Text>
      </View>
      <Section title="Para ver" count={paraVer.length} data={paraVer} />
      <Section title="Vistos" count={vistos.length} data={vistos} />
      <Section title="Lançamentos futuros" count={futures.length} data={futures} />
    </ScrollView>
  );
}