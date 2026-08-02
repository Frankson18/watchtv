import { useState } from "react";
import { View, Text, TouchableOpacity, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Poster from "./poster";
import { markEpisode } from "@/lib/library";
import type { LibraryItem } from "@/lib/types";

export default function TrackCard({
  item,
  totalEps,
  watchedCount,
  onUpdated,
}: {
  item: LibraryItem;
  totalEps?: number;
  watchedCount?: number;
  onUpdated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [popping, setPopping] = useState(false);
  const [epDisplay, setEpDisplay] = useState(watchedCount ?? item.current_episode);

  const total = totalEps ?? 0;
  const watched = epDisplay;
  const remaining = total ? Math.max(0, total - watched) : 0;
  const pct = total ? Math.min(100, Math.round((watched / total) * 100)) : 0;

  async function confirm() {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const next = item.current_episode + 1;
      await markEpisode(item.id, item.current_season, next, item.tmdb_id);
      setEpDisplay(next);
      setFlash(true);
      setPopping(true);
      setTimeout(() => setFlash(false), 450);
      setTimeout(() => setPopping(false), 350);
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      onPress={() => router.push(`/titulo/${item.tmdb_id}`)}
      style={{
        flexDirection: "row",
        gap: 12,
        padding: 12,
        backgroundColor: flash ? "rgba(91,214,143,0.1)" : "#161619",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: flash ? "rgba(91,214,143,0.3)" : "#2A2A30",
      }}
    >
      <View style={{ width: 60, height: 88, flexShrink: 0 }}>
        <Poster path={item.poster_path} alt={item.title} size="w92" style={{ width: "100%", height: "100%" }} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#F5F5F7", flex: 1 }} numberOfLines={1}>
            {item.title}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#6A6A72" />
          <View style={{ backgroundColor: "#7E2828", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 0 }}>
            <Text style={{ fontSize: 10, fontWeight: "600", color: "#F24E4E" }}>Assistindo</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, fontWeight: "500", color: "#A8A8B0" }}>
          T{item.current_season} • E{watched}
          {total ? ` de ${total}` : ""}
        </Text>
        <View style={{ height: 4, backgroundColor: "#2A2A30", borderRadius: 2, overflow: "hidden" }}>
          <View style={{ height: 4, backgroundColor: "#F24E4E", borderRadius: 2, width: `${pct}%` }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 11, color: "#6A6A72" }}>
            {total ? `Faltam ${remaining} eps` : "—"}
          </Text>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              confirm();
            }}
            disabled={busy}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#F24E4E",
              justifyContent: "center",
              alignItems: "center",
              transform: [{ scale: popping ? 1.25 : 1 }],
            }}
          >
            <Ionicons name="checkmark" size={20} color={popping ? "#5BD68F" : "#F5F5F7"} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}