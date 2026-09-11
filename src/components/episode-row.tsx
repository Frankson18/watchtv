import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
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
  rating,
  onUpdated,
  onOpen,
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
  rating?: number;
  onUpdated?: () => void;
  onOpen?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [optimistic, setOptimistic] = useState<{ w: boolean; c: number } | null>(null);

  useEffect(() => {
    setOptimistic(null);
  }, [watched, watchCount]);

  const isWatched = optimistic?.w ?? watched;
  const count = optimistic?.c ?? watchCount;

  async function onCheck() {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (!isWatched) {
        await markEpisode(libraryId, season, episode, tmdbId);
        setOptimistic({ w: true, c: watchCount + 1 });
      } else {
        await rewatchEpisode(libraryId, season, episode);
        setOptimistic({ w: true, c: watchCount + 1 });
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
    <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
      <Pressable
        onPress={onCheck}
        disabled={busy}
        hitSlop={8}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: isWatched ? 0 : 2,
          borderColor: "#2A2A30",
          backgroundColor: isWatched ? "#F24E4E" : "transparent",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 2,
        }}
      >
        {isWatched && <Ionicons name="checkmark" size={16} color="#F5F5F7" />}
      </Pressable>

      <Pressable onPress={onOpen} style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#F5F5F7", flex: 1 }} numberOfLines={1}>
            E{episode} · {title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {rating ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <Ionicons name="star" size={11} color="#F5A623" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#F5A623" }}>{rating.toFixed(1)}</Text>
              </View>
            ) : null}
            {count > 1 && <Text style={{ fontSize: 11, fontWeight: "700", color: "#F24E4E" }}>×{count}</Text>}
            <Text style={{ fontSize: 12, color: "#6A6A72" }}>{dateFmt}</Text>
            <Ionicons name="chevron-forward" size={14} color="#6A6A72" />
          </View>
        </View>
        {synopsis ? (
          <Text style={{ fontSize: 12, color: "#A8A8B0", lineHeight: 16 }} numberOfLines={2}>{synopsis}</Text>
        ) : null}
        <Text style={{ fontSize: 11, color: "#6A6A72" }}>{runtime ? `${runtime} min` : "—"}</Text>
      </Pressable>
    </View>
  );
}
