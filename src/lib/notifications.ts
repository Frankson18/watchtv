import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { listLibrary } from "./library";
import { tmdb } from "./tmdb";
import { registerPushToken } from "./push";

const ENABLED_KEY = "watchtv:notifications-enabled";
const CHANNEL_ID = "releases";
const MAX_SCHEDULED = 50;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function notificationsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === "1";
}

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Lançamentos",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#F24E4E",
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return req.granted;
}

export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  if (!enabled) {
    await AsyncStorage.setItem(ENABLED_KEY, "0");
    await Notifications.cancelAllScheduledNotificationsAsync();
    return false;
  }
  const granted = await requestPermission();
  if (!granted) {
    await AsyncStorage.setItem(ENABLED_KEY, "0");
    return false;
  }
  await AsyncStorage.setItem(ENABLED_KEY, "1");
  await syncNotifications();
  return true;
}

/**
 * Push do servidor é o principal. Se o token não puder ser obtido (sem FCM,
 * por exemplo), cai para notificações locais agendadas no aparelho.
 */
export async function syncNotifications(): Promise<void> {
  if (!(await notificationsEnabled())) return;
  const token = await registerPushToken();
  if (token) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } else {
    await scheduleReleaseReminders();
  }
}

function atNine(dateStr: string): Date | null {
  const d = new Date(`${dateStr}T09:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = Date.now();
  if (d.getTime() > now) return d;
  // hoje e já passou das 9h → avisa em 1 minuto
  if (d.toDateString() === new Date().toDateString()) return new Date(now + 60_000);
  return null;
}

/** (Re)agenda os avisos de lançamento com base na biblioteca atual. */
export async function scheduleReleaseReminders(): Promise<number> {
  if (!(await notificationsEnabled())) return 0;
  await requestPermission();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const items = await listLibrary();
  const targets: { id: string; date: Date; title: string; body: string }[] = [];

  for (const it of items) {
    if (it.status === "dropped") continue;
    try {
      if (it.media_type === "tv") {
        const tv = await tmdb.tv(it.tmdb_id);
        const next = tv.next_episode_to_air;
        if (next?.air_date) {
          const when = atNine(next.air_date);
          if (when) {
            const code = `T${String(next.season_number).padStart(2, "0")}E${String(next.episode_number).padStart(2, "0")}`;
            targets.push({
              id: `watchtv-tv-${it.tmdb_id}-s${next.season_number}e${next.episode_number}`,
              date: when,
              title: `Novo episódio de ${it.title}`,
              body: `${code}${next.name ? ` · ${next.name}` : ""} já está disponível.`,
            });
          }
        }
      } else {
        if (it.status === "completed") continue;
        if (it.release_date) {
          const when = atNine(it.release_date);
          if (when) {
            targets.push({
              id: `watchtv-movie-${it.tmdb_id}`,
              date: when,
              title: `${it.title} estreia hoje`,
              body: "Seu filme da lista chegou aos cinemas.",
            });
          }
        }
      }
    } catch {}
  }

  targets.sort((a, b) => a.date.getTime() - b.date.getTime());
  const limited = targets.slice(0, MAX_SCHEDULED);
  for (const t of limited) {
    await Notifications.scheduleNotificationAsync({
      identifier: t.id,
      content: { title: t.title, body: t.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: t.date,
        channelId: CHANNEL_ID,
      },
    });
  }
  return limited.length;
}
