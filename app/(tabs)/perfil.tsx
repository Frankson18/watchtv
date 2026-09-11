import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Poster from "@/components/poster";
import ScalePressable from "@/components/scale-pressable";
import { useAuth } from "@/lib/use-auth";
import { createClient } from "@/lib/supabase";
import { notificationsEnabled, setNotificationsEnabled } from "@/lib/notifications";
import {
  getStats,
  getRecentActivity,
  getContributionData,
  formatDuration,
  type Stats,
  type RecentActivity,
  type ContributionDay,
} from "@/lib/stats";

function relTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months > 1 ? "es" : ""}`;
}

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentActivity[]>([]);
  const [contrib, setContrib] = useState<ContributionDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifOn, setNotifOn] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    notificationsEnabled().then((v) => { if (active) setNotifOn(v); });
    (async () => {
      const [s, r, c] = await Promise.all([
        getStats(),
        getRecentActivity(5),
        getContributionData(year),
      ]);
      if (!active) return;
      setStats(s);
      setRecent(r);
      setContrib(c);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [year]);

  async function toggleNotifications(value: boolean) {
    setNotifOn(value);
    const result = await setNotificationsEnabled(value);
    setNotifOn(result);
    if (value && !result) {
      Alert.alert("Permissão necessária", "Ative as notificações nas configurações do sistema para receber os avisos.");
    }
  }

  const email = user?.email ?? "—";
  const name = email.split("@")[0];
  const initial = name.charAt(0).toUpperCase();
  const createdAt = user?.created_at ? new Date(user.created_at) : null;

  function levelColor(count: number): string {
    if (count === 0) return "#1F1F24";
    if (count === 1) return "#7E2828";
    if (count <= 3) return "#F24E4E";
    return "#FF6E6E";
  }

  const total = contrib.reduce((acc, d) => acc + d.count, 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0B0B0E" }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, gap: 20, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#F24E4E", justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#F5F5F7" }}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#F5F5F7" }} numberOfLines={1}>{name}</Text>
          <Text style={{ fontSize: 12, color: "#A8A8B0" }} numberOfLines={1}>{email}</Text>
          {createdAt && (
            <Text style={{ fontSize: 11, color: "#6A6A72", marginTop: 2 }}>
              Membro desde {createdAt.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#F24E4E" />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <StatCard label="Séries" value={stats?.showsWatching ?? 0} icon="tv" sub="assistindo" />
            <StatCard label="Filmes" value={stats?.moviesWatched ?? 0} icon="film" sub="vistos" />
            <StatCard label="Episódios" value={stats?.episodesTotal ?? 0} icon="play" sub="totais" />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6A6A72" }}>TEMPO ASSISTIDO</Text>
            <DurationRow label="Séries" value={formatDuration(stats?.durationTvMinutes ?? 0)} />
            <DurationRow label="Filmes" value={formatDuration(stats?.durationMoviesMinutes ?? 0)} />
          </View>

          {stats && stats.topGenres.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#6A6A72" }}>GÊNEROS MAIS VISTOS</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {stats.topGenres.map((g) => (
                  <View key={g} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: "#161619", borderWidth: 1, borderColor: "#2A2A30" }}>
                    <Text style={{ fontSize: 12, fontWeight: "500", color: "#A8A8B0" }}>{g}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6A6A72" }}>ÚLTIMOS VISTOS</Text>
            {recent.length === 0 ? (
              <Text style={{ color: "#A8A8B0", fontSize: 14, textAlign: "center", paddingVertical: 24 }}>Nada visto ainda.</Text>
            ) : (
              recent.map((r) => (
                <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 8, backgroundColor: "#161619", borderRadius: 10 }}>
                  <View style={{ width: 40, height: 60 }}>
                    <Poster path={r.poster_path} alt={r.title} size="w92" style={{ width: "100%", height: "100%" }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#F5F5F7" }} numberOfLines={1}>{r.title}</Text>
                    <Text style={{ fontSize: 12, color: "#A8A8B0" }}>
                      {r.media_type === "movie"
                        ? "Filme"
                        : `T${r.season} • E${r.episode}${r.watch_count > 1 ? ` ×${r.watch_count}` : ""}`}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: "#6A6A72" }}>{relTime(r.watched_at)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6A6A72" }}>ATIVIDADE</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6A6A72" }}>
              {total} contribuições em {year}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 3 }}>
                {Array.from({ length: 53 }).map((_, w) => (
                  <View key={w} style={{ flexDirection: "column", gap: 3 }}>
                    {Array.from({ length: 7 }).map((_, d) => {
                      const idx = w * 7 + d;
                      const day = contrib[idx];
                      return (
                        <View
                          key={d}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            backgroundColor: day ? levelColor(day.count) : "#1F1F24",
                          }}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
              <Text style={{ fontSize: 10, color: "#6A6A72" }}>Menos</Text>
              {[0, 1, 2, 3].map((lv) => (
                <View key={lv} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: levelColor(lv === 0 ? 0 : lv === 1 ? 1 : lv === 2 ? 3 : 5) }} />
              ))}
              <Text style={{ fontSize: 10, color: "#6A6A72" }}>Mais</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, backgroundColor: "#161619", borderWidth: 1, borderColor: "#2A2A30" }}>
            <Ionicons name="notifications-outline" size={20} color="#A8A8B0" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: "#F5F5F7" }}>Notificações de lançamento</Text>
              <Text style={{ fontSize: 12, color: "#6A6A72" }}>Avisar quando episódios e filmes da sua lista chegarem</Text>
            </View>
            <Switch
              value={notifOn}
              onValueChange={toggleNotifications}
              trackColor={{ true: "#F24E4E", false: "#2A2A30" }}
              thumbColor="#F5F5F7"
            />
          </View>

          <SignOutButton />
        </>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, icon, sub }: { label: string; value: number; icon: string; sub: string }) {
  return (
    <View style={{ width: "48%", gap: 4, padding: 12, backgroundColor: "#161619", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A30" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 12, color: "#6A6A72" }}>{label}</Text>
        <Ionicons name={icon as any} size={16} color="#F24E4E" />
      </View>
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#F5F5F7" }}>{value}</Text>
      <Text style={{ fontSize: 11, color: "#6A6A72" }}>{sub}</Text>
    </View>
  );
}

function DurationRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 13, color: "#A8A8B0" }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "bold", color: "#F5F5F7" }}>{value}</Text>
    </View>
  );
}

function SignOutButton() {
  const sb = createClient();
  return (
    <ScalePressable
      onPress={async () => {
        await sb?.auth.signOut();
        router.replace("/login");
      }}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: "#161619", borderWidth: 1, borderColor: "#2A2A30" }}
    >
      <Ionicons name="log-out-outline" size={18} color="#A8A8B0" />
      <Text style={{ fontSize: 14, fontWeight: "500", color: "#A8A8B0" }}>Sair</Text>
    </ScalePressable>
  );
}