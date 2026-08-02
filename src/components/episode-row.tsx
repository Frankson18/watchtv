import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { markEpisode, rewatchEpisode } from "@/lib/library";

export default function EpisodeRow({
  libraryId,
  season,
  episode,
  title,
  runtime,
  airDate,
  synopsis,
  watched,
  watchCount,
  tmdbId,
  onUpdated,
}: {
  libraryId: string;
  season: number;
  episode: number;
  title: string;
  runtime: number | null;
  airDate: string | null;
  synopsis: string;
  watched: boolean;
  watchCount: number;
  tmdbId: number;
  onUpdated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [localWatched, setLocalWatched] = useState(watched);
  const [localCount, setLocalCount] = useState(watchCount);

  async function onCheck() {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (!localWatched) {
        await markEpisode(libraryId, season, episode, tmdbId);
        setLocalWatched(true);
        setLocalCount((c) => c + 1);
      } else {
        await rewatchEpisode(libraryId, season, episode);
        setLocalCount((c) => c + 1);
      }
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  }

  const dateFmt = airDate
    ? new Date(airDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : "—";

  return (
    <TouchableOpacity
      onPress={onCheck}
      disabled={busy}
      style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: localWatched ? 0 : 2,
          borderColor: "#2A2A30",
          backgroundColor: localWatched ? "#F24E4E" : "transparent",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 2,
        }}
      >
        {localWatched && <Ionicons name="checkmark" size={16} color="#F5F5F7" strokeWidth={3} />}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#F5F5F7", flex: 1 }} numberOfLines={1}>
            E{episode} · {title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {localCount > 1 && <Text style={{ fontSize: 11, fontWeight: "700", color: "#F24E4E" }}>×{localCount}</Text>}
            <Text style={{ fontSize: 12, color: "#6A6A72" }}>{dateFmt}</Text>
          </View>
        </View>
        {synopsis ? (
          <Text style={{ fontSize: 12, color: "#A8A8B0", lineHeight: 16 }} numberOfLines={2}>{synopsis}</Text>
        ) : null}
        <Text style={{ fontSize: 11, color: "#6A6A72" }}>{runtime ? `${runtime} min` : "—"}</Text>
      </View>
    </TouchableOpacity>
  );
}