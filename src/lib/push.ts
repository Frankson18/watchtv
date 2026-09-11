import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { createClient } from "./supabase";

/**
 * Registra o token de push (Expo) do aparelho no Supabase, para o backend
 * poder enviar notificações mesmo com o app fechado.
 * Requer projeto EAS (projectId) e, no Android, credenciais FCM configuradas.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    const c = createClient();
    if (!c) {
      console.warn("[push] Supabase não configurado");
      return null;
    }
    const { data } = await c.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      console.warn("[push] sem sessão de usuário");
      return null;
    }

    const perm = await Notifications.getPermissionsAsync();
    let granted = perm.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) {
      console.warn("[push] permissão de notificação negada");
      return null;
    }

    const projectId =
      (Constants?.expoConfig as any)?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;

    const resp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = resp.data;

    const up = await c
      .from("push_tokens")
      .upsert(
        { user_id: userId, token, platform: Platform.OS },
        { onConflict: "user_id,token" },
      );
    if (up.error) {
      console.warn("[push] erro ao salvar token:", up.error.message);
      return null;
    }
    return token;
  } catch (e: any) {
    console.warn("[push] falha:", e?.message ?? String(e));
    return null;
  }
}
