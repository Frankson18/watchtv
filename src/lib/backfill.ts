import { createClient } from "./supabase";
import type { LibraryItem } from "./types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { tmdb } from "./tmdb";
import { isMockMode } from "./tmdb-config";

const BACKFILL_KEY = "watchtv:backfilled-real";

export async function backfillRealImagesOnce(): Promise<void> {
  if (await AsyncStorage.getItem(BACKFILL_KEY)) return;
  if (isMockMode()) {
    await AsyncStorage.setItem(BACKFILL_KEY, "1");
    return;
  }
  const c = createClient();
  if (!c) return;
  const { data } = await c.auth.getSession();
  if (!data.session) return;

  try {
    const { data: items } = await c
      .from("library")
      .select("*")
      .eq("user_id", data.session.user.id);
    const lib = (items ?? []) as LibraryItem[];

    const needsUpdate = lib.filter(
      (i) =>
        i.poster_path === "/mock/poster.jpg" ||
        i.backdrop_path === "/mock/backdrop.jpg" ||
        !i.poster_path,
    );

    if (needsUpdate.length === 0) {
      await AsyncStorage.setItem(BACKFILL_KEY, "1");
      return;
    }

    for (const item of needsUpdate) {
      try {
        const d =
          item.media_type === "tv"
            ? await tmdb.tv(item.tmdb_id)
            : await tmdb.movie(item.tmdb_id);
        const poster = d.poster_path ?? null;
        const backdrop = d.backdrop_path ?? null;
        if (poster && poster !== "/mock/poster.jpg") {
          await c
            .from("library")
            .update({ poster_path: poster, backdrop_path: backdrop })
            .eq("id", item.id);
        }
      } catch {}
    }
    await AsyncStorage.setItem(BACKFILL_KEY, "1");
  } catch (e) {
    console.warn("backfill failed", e);
  }
}