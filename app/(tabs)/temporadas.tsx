import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Poster from "@/components/poster";
import { listLibrary, markEpisode } from "@/lib/library";
import { tmdb } from "@/lib/tmdb";
import { isMockMode } from "@/lib/tmdb-config";
import type { LibraryItem } from "@/lib/types";

interface SeasonInfo {
  item: LibraryItem;
  newSeasonNumber: number;
  airDate: string | null;
  status: "estreando" | "em_exibicao" | "em_breve";
}

export default function TemporadasScreen() {
  const insets = useSafeAreaInsets();
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await listLibrary({ mediaType: "tv" });
    const out: SeasonInfo[] = [];
    const now = new Date();
    for (const it of data) {
      if (!it?.id) continue;
      try {
        const tv = isMockMode() ? await tmdb.tv(it.tmdb_id) : await tmdb.tv(it.tmdb_id);
        for (const s of tv.seasons ?? []) {
          if (s.season_number <= it.current_season) continue;
          const airDate = s.air_date ? new Date(s.air_date) : null;
          let status: SeasonInfo["status"] = "em_breve";
          if (airDate) {
            if (airDate <= now) status = "em_exibicao";
            else if (airDate.getTime() - now.getTime() < 86400000 * 60) status = "estreando";
          }
          out.push({ item: it, newSeasonNumber: s.season_number, airDate: s.air_date, status });
        }
      } catch {}
    }
    out.sort((a, b) => {
      const da = a.airDate ? new Date(a.airDate).getTime() : Infinity;
      const db = b.airDate ? new Date(b.airDate).getTime() : Infinity;
      return da - db;
    });
    setSeasons(out);
    setLoading(false);
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
    <ScrollView style={{ flex: 1, backgroundColor: "#0B0B0E" }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
      <View style={{ gap: 4, marginBottom: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#F5F5F7" }}>Novas temporadas</Text>
        <Text style={{ fontSize: 13, color: "#A8A8B0" }}>Séries que você acompanha com estreias próximas</Text>
      </View>
      {seasons.length === 0 ? (
        <Text style={{ color: "#A8A8B0", fontSize: 14, textAlign: "center", paddingVertical: 48 }}>
          Nenhuma nova temporada anunciada.
        </Text>
      ) : (
        seasons.map((s) => {
          if (!s?.item?.id) return null;
          const dateFmt = s.airDate
            ? new Date(s.airDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
            : "Em breve";
          const statusInfo =
            s.status === "estreando"
              ? { label: "Estreando", dot: "#F5A623", text: "#F5A623" }
              : { label: "Em exibição", dot: "#5BD68F", text: "#5BD68F" };
          return (
            <TouchableOpacity
              key={`${s.item.id}-${s.newSeasonNumber}`}
              onPress={() => router.push(`/titulo/${s.item.tmdb_id}`)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, backgroundColor: "#161619", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A30" }}
            >
              <View style={{ width: 54, height: 80, flexShrink: 0 }}>
                <Poster path={s.item.poster_path} alt={s.item.title} size="w92" style={{ width: "100%", height: "100%" }} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#F5F5F7" }} numberOfLines={1}>{s.item.title}</Text>
                <Text style={{ fontSize: 12, color: "#A8A8B0" }}>T{s.newSeasonNumber} · {dateFmt}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusInfo.dot }} />
                  <Text style={{ fontSize: 11, fontWeight: "600", color: statusInfo.text }}>{statusInfo.label}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6A6A72" />
              <TouchableOpacity
                onPress={async (e) => {
                  e.stopPropagation?.();
                  await markEpisode(s.item.id, s.newSeasonNumber, 0);
                  load();
                }}
                style={{ paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#F24E4E" }}>Acompanhar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}