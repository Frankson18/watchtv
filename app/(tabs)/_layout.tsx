import { Tabs, router } from "expo-router";
import { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/use-auth";
import { seedDemoLibraryOnce } from "@/lib/seed";
import { backfillRealImagesOnce } from "@/lib/backfill";

export default function TabsLayout() {
  const { user, loading, configured } = useAuth();
  const insets = useSafeAreaInsets();
  const seededRef = useRef(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!configured) {
      router.replace("/login");
      return;
    }
    if (!user && !redirectingRef.current) {
      redirectingRef.current = true;
      router.replace("/login");
    }
  }, [loading, user, configured]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId || seededRef.current) return;
    seededRef.current = true;
    seedDemoLibraryOnce().then(() => {
      backfillRealImagesOnce();
    });
  }, [userId]);

  if (loading || (!user && configured)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B0B0E" }}>
        <ActivityIndicator size="large" color="#F24E4E" />
      </View>
    );
  }

  if (!configured) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: "#0B0B0E" }}>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "#F5F5F7", marginBottom: 8 }}>
          Configuração pendente
        </Text>
        <Text style={{ fontSize: 14, color: "#A8A8B0", textAlign: "center" }}>
          Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env
        </Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "#0B0B0E" },
        tabBarStyle: {
          backgroundColor: "#1F1F24",
          borderTopColor: "#2A2A30",
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#F24E4E",
        tabBarInactiveTintColor: "#6A6A72",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
      }}
    >
      <Tabs.Screen name="assistindo" options={{ title: "Assistindo", tabBarIcon: ({ color, size }) => <Ionicons name="play" color={color} size={size} /> }} />
      <Tabs.Screen name="temporadas" options={{ title: "Temporadas", tabBarIcon: ({ color, size }) => <Ionicons name="layers" color={color} size={size} /> }} />
      <Tabs.Screen name="calendario" options={{ title: "Calendário", tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }} />
      <Tabs.Screen name="filmes" options={{ title: "Filmes", tabBarIcon: ({ color, size }) => <Ionicons name="film" color={color} size={size} /> }} />
      <Tabs.Screen name="buscar" options={{ title: "Buscar", tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} /> }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}