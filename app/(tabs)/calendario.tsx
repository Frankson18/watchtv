import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Poster from "@/components/poster";
import { listLibrary } from "@/lib/library";
import { tmdb } from "@/lib/tmdb";
import type { LibraryItem } from "@/lib/types";

interface Episode {
  id: string;
  item: LibraryItem;
  season: number;
  episode: number;
  airDate: string;
}

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function EpisodeCard({ e }: { e: Episode }) {
  const d = new Date(e.airDate);
  const wd = d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3).toUpperCase();
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/titulo/${e.item.tmdb_id}`)}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, backgroundColor: "#161619", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A30" }}
    >
      <View style={{ width: 40, height: 48, borderRadius: 8, backgroundColor: "#1F1F24", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#F24E4E" }}>{d.getDate()}</Text>
        <Text style={{ fontSize: 9, fontWeight: "600", color: "#6A6A72", marginTop: 2 }}>{wd}</Text>
      </View>
      <View style={{ width: 40, height: 56, flexShrink: 0 }}>
        <Poster path={e.item.poster_path} alt={e.item.title} size="w92" style={{ width: "100%", height: "100%" }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#F5F5F7" }} numberOfLines={1}>{e.item.title}</Text>
        <Text style={{ fontSize: 12, color: "#A8A8B0" }}>T{e.season} • E{e.episode}</Text>
        <Text style={{ fontSize: 11, color: "#6A6A72" }}>
          {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#6A6A72" />
    </TouchableOpacity>
  );
}

export default function CalendarioScreen() {
  const insets = useSafeAreaInsets();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const load = useCallback(async () => {
    const data = await listLibrary({ mediaType: "tv" });
    const eps: Episode[] = [];
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    for (const it of data) {
      try {
        const tv = await tmdb.tv(it.tmdb_id);
        for (const s of tv.seasons ?? []) {
          if (!s.air_date) continue;
          const seasonStart = new Date(s.air_date);
          if (seasonStart > monthEnd) continue;
          try {
            const seasonData = await tmdb.tvSeason(it.tmdb_id, s.season_number);
            for (const ep of seasonData.episodes ?? []) {
              if (!ep.air_date) continue;
              const d = new Date(ep.air_date);
              if (d >= monthStart && d <= monthEnd) {
                eps.push({
                  id: `${it.id}-${s.season_number}-${ep.episode_number}`,
                  item: it,
                  season: s.season_number,
                  episode: ep.episode_number,
                  airDate: ep.air_date,
                });
              }
            }
          } catch {}
        }
      } catch {}
    }
    eps.sort((a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime());
    setEpisodes(eps);
    setLoading(false);
  }, [cursor]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const dayMap = useMemo(() => {
    const m = new Map<string, Episode[]>();
    for (const e of episodes) {
      const key = e.airDate.slice(0, 10);
      const arr = m.get(key) ?? [];
      arr.push(e);
      m.set(key, arr);
    }
    return m;
  }, [episodes]);

  const upcoming = episodes.filter((e) => new Date(e.airDate) >= new Date(new Date().toDateString()));

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const today = new Date().toDateString();
  const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0B0B0E" }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 16, gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#F5F5F7" }}>Calendário</Text>
        <Text style={{ fontSize: 13, color: "#A8A8B0" }}>
          Próximos episódios · {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <TouchableOpacity onPress={() => { setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)); setSelectedDay(null); }} style={{ padding: 6, backgroundColor: "#161619", borderRadius: 6 }}>
          <Ionicons name="chevron-back" size={18} color="#A8A8B0" />
        </TouchableOpacity>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#F5F5F7", textTransform: "capitalize" }}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => { setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)); setSelectedDay(null); }} style={{ padding: 6, backgroundColor: "#161619", borderRadius: 6 }}>
          <Ionicons name="chevron-forward" size={18} color="#A8A8B0" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row" }}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: "600", color: "#6A6A72" }}>{d}</Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: "row" }}>
          {week.map((day, di) => {
            if (day === null) return <View key={`empty-${wi}-${di}`} style={{ flex: 1, paddingVertical: 4 }} />;
            const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
            const key = ymd(date);
            const has = dayMap.has(key);
            const isToday = date.toDateString() === today;
            const isSelected = selectedDay === key;
            return (
              <TouchableOpacity
                key={day}
                activeOpacity={0.7}
                onPress={() => setSelectedDay((prev) => (prev === key ? null : key))}
                style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}
              >
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: isSelected ? "#F24E4E" : "transparent" }}>
                  <Text style={{ fontSize: 13, fontWeight: isToday || isSelected ? "700" : "500", color: isSelected ? "#F5F5F7" : isToday ? "#F24E4E" : "#F5F5F7" }}>{day}</Text>
                </View>
                <View style={{ height: 6, justifyContent: "center" }}>
                  {has && !isSelected && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#F24E4E" }} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <View style={{ gap: 10, marginTop: 8 }}>
        {selectedDay ? (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.4, color: "#6A6A72", flex: 1 }} numberOfLines={1}>
                {new Date(selectedDay + "T00:00:00")
                  .toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
                  .toUpperCase()}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <Text style={{ fontSize: 12, color: "#6A6A72" }}>Fechar</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator size="large" color="#F24E4E" />
            ) : (dayMap.get(selectedDay) ?? []).length === 0 ? (
              <Text style={{ color: "#A8A8B0", fontSize: 14, paddingVertical: 16 }}>
                Nenhum episódio neste dia.
              </Text>
            ) : (
              (dayMap.get(selectedDay) ?? []).map((e) => <EpisodeCard key={e.id} e={e} />)
            )}
          </>
        ) : (
          <>
            <Text style={{ fontSize: 13, fontWeight: "600", letterSpacing: 0.4, color: "#6A6A72" }}>POR VIR</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#F24E4E" />
            ) : upcoming.length === 0 ? (
              <Text style={{ color: "#A8A8B0", fontSize: 14, textAlign: "center", paddingVertical: 24 }}>
                Nenhum episódio por vir neste mês.
              </Text>
            ) : (
              upcoming.map((e) => <EpisodeCard key={e.id} e={e} />)
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}