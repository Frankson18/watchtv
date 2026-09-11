import { Tabs, router } from "expo-router";
import { useEffect, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/use-auth";
import { seedDemoLibraryOnce } from "@/lib/seed";
import { backfillRealImagesOnce } from "@/lib/backfill";
import { repairEpisodeOverflowOnce } from "@/lib/repair";
import { syncNotifications } from "@/lib/notifications";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: "#0B0B0E" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#1F1F24",
          borderRadius: 999,
          padding: 8,
          shadowColor: "#000",
          shadowOpacity: 0.37,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 12,
        }}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label: string = options.title ?? route.name;
          const active = state.index === index;
          const color = active ? "#F24E4E" : "#6A6A72";
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 }}
            >
              {options.tabBarIcon?.({ color, size: 22, focused: active })}
              <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: active ? "600" : "500", color }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { user, loading, configured } = useAuth();
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
      repairEpisodeOverflowOnce();
      syncNotifications();
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
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#0B0B0E" } }}
    >
      <Tabs.Screen name="assistindo" options={{ title: "Assistindo", tabBarIcon: ({ color, size }) => <Ionicons name="play" color={color} size={size} /> }} />
      <Tabs.Screen name="temporadas" options={{ title: "Minha lista", tabBarIcon: ({ color, size }) => <Ionicons name="albums" color={color} size={size} /> }} />
      <Tabs.Screen name="calendario" options={{ title: "Calendário", tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }} />
      <Tabs.Screen name="buscar" options={{ title: "Buscar", tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} /> }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
