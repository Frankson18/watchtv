import { createClient } from "./supabase";
import type { LibraryItem } from "./types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { tmdb } from "./tmdb";

const REPAIR_KEY = "watchtv:repaired-episode-overflow-v2";

/**
 * Corrige dados inválidos de progresso:
 * - `current_episode` acima do total de episódios da temporada atual.
 * - Episódios assistidos fora do intervalo válido da temporada (ex.: E12 de uma temporada de 9).
 *
 * Roda uma única vez por instalação (marcador no AsyncStorage).
 */
export async function repairEpisodeOverflowOnce(): Promise<void> {
  if (await AsyncStorage.getItem(REPAIR_KEY)) return;
  const c = createClient();
  if (!c) return;
  const { data } = await c.auth.getSession();
  if (!data.session) return;

  try {
    const { data: items } = await c
      .from("library")
      .select("*")
      .eq("media_type", "tv");
    const lib = (items ?? []) as LibraryItem[];

    for (const it of lib) {
      try {
        const tv = await tmdb.tv(it.tmdb_id);
        const seasons = tv.seasons ?? [];

        const current = seasons.find((s) => s.season_number === it.current_season);
        const count = current?.episode_count ?? 0;
        if (count > 0 && (it.current_episode > count || it.current_episode < 0)) {
          await c
            .from("library")
            .update({ current_episode: count })
            .eq("id", it.id);
        } else if (count > 0 && it.status === "completed" && it.current_episode < count) {
          // Foi marcada como concluída por engano, mas ainda há episódios por assistir.
          await c
            .from("library")
            .update({ status: "watching" })
            .eq("id", it.id);
        }

        const { data: eps } = await c
          .from("watched_episodes")
          .select("id, season, episode")
          .eq("library_id", it.id);
        const bad = ((eps ?? []) as { id: string; season: number; episode: number }[]).filter(
          (e) => {
            const s = seasons.find((sn) => sn.season_number === e.season);
            if (!s) return true;
            if (!s.episode_count) return false;
            return e.episode < 1 || e.episode > s.episode_count;
          },
        );
        if (bad.length > 0) {
          await c
            .from("watched_episodes")
            .delete()
            .in("id", bad.map((b) => b.id));
        }
      } catch {}
    }
    await AsyncStorage.setItem(REPAIR_KEY, "1");
  } catch (e) {
    console.warn("repair failed", e);
  }
}
