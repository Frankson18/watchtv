import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

function NotificationDeepLink() {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const tmdbId = (response?.notification?.request?.content?.data as any)?.tmdb_id;
      if (tmdbId) router.push(`/titulo/${tmdbId}`);
    };

    // App aberto a partir de uma notificação (com app fechado)
    const timer = setTimeout(() => {
      Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    }, 400);

    // Toque na notificação com o app em background/aberto
    const sub = Notifications.addNotificationResponseReceivedListener(open);

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0B0B0E" />
        <NotificationDeepLink />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0B0B0E" },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="titulo/[id]" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
