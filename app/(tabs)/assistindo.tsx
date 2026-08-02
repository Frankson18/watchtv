import { useState, useCallback } from "react";
import { View, Text, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@/lib/use-focus-effect";
import TrackCard from "@/components/track-card";
import { listWatching } from "@/lib/library";
import { tmdb } from "@/lib/tmdb";
import { isMockMode } from "@/lib/tmdb-config";
import type { LibraryItem } from "@/lib/types";

export default function AssistindoScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [epCounts, setEpCounts] = useState<Record<string, { total: number; watched: number }>>({});

  const load = useCallback(async () => {
    const data = await listWatching();
    setItems(data);
    setLoading(false);
    setRefreshing(false);
    if (!isMockMode()) {
      for (const it of data) {
        try {
          const tv = await tmdb.tv(it.tmdb_id);
          const season = tv.seasons?.find((s) => s.season_number === it.current_season);
          const total = season?.episode_count ?? 0;
          setEpCounts((prev) => ({ ...prev, [it.id]: { total, watched: it.current_episode } }));
        } catch {}
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B0B0E" }}>
        <ActivityIndicator size="large" color="#F24E4E" />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F24E4E" />}
      style={{ flex: 1, backgroundColor: "#0B0B0E" }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}
      ListHeaderComponent={
        <View style={{ gap: 4, marginBottom: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: "bold", color: "#F5F5F7" }}>Assistindo agora</Text>
          <Text style={{ fontSize: 13, color: "#A8A8B0" }}>Ordenado pelo mais recente</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingVertical: 64, gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#F5F5F7" }}>Nada em andamento</Text>
          <Text style={{ fontSize: 14, color: "#A8A8B0", textAlign: "center", maxWidth: 260 }}>
            Busque e adicione uma série ou anime para começar.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <TrackCard
          item={item}
          totalEps={epCounts[item.id]?.total}
          watchedCount={epCounts[item.id]?.watched}
          onUpdated={load}
        />
      )}
    />
  );
}