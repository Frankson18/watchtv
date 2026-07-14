"use client";

import { createClient } from "./supabase-client";
import type { LibraryItem } from "./types";

const BACKFILL_KEY = "watchtv:backfilled-real";

export async function backfillRealImagesOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(BACKFILL_KEY)) return;
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
      localStorage.setItem(BACKFILL_KEY, "1");
      return;
    }

    for (const item of needsUpdate) {
      try {
        const endpoint =
          item.media_type === "tv"
            ? `/api/tmdb/tv/${item.tmdb_id}`
            : `/api/tmdb/movie/${item.tmdb_id}`;
        const r = await fetch(endpoint);
        if (!r.ok) continue;
        const d = await r.json();
        const poster = d.poster_path ?? null;
        const backdrop = d.backdrop_path ?? null;
        if (poster && poster !== "/mock/poster.jpg") {
          await c
            .from("library")
            .update({ poster_path: poster, backdrop_path: backdrop })
            .eq("id", item.id);
        }
      } catch {
        /* ignore */
      }
    }
    localStorage.setItem(BACKFILL_KEY, "1");
  } catch (e) {
    console.warn("backfill failed", e);
  }
}