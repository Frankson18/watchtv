"use client";

import { createClient } from "./supabase-client";
import type { MediaType, MediaStatus } from "./types";

const SEED_KEY = "watchtv:seeded";

interface SeedItem {
  tmdb_id: number;
  media_type: MediaType;
  status: MediaStatus;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  current_season: number;
  current_episode: number;
  total_seasons: number | null;
}

const SEED: SeedItem[] = [
  {
    tmdb_id: 1396, media_type: "tv", status: "watching", title: "Severance",
    poster_path: "/mock/poster.jpg", backdrop_path: "/mock/backdrop.jpg",
    release_date: "2022-02-18", current_season: 2, current_episode: 5, total_seasons: 2,
  },
  {
    tmdb_id: 1397, media_type: "tv", status: "watching", title: "The Bear",
    poster_path: "/mock/poster.jpg", backdrop_path: "/mock/backdrop.jpg",
    release_date: "2022-06-22", current_season: 3, current_episode: 7, total_seasons: 3,
  },
  {
    tmdb_id: 1398, media_type: "tv", status: "watching", title: "Shogun",
    poster_path: "/mock/poster.jpg", backdrop_path: "/mock/backdrop.jpg",
    release_date: "2024-02-27", current_season: 1, current_episode: 3, total_seasons: 1,
  },
  {
    tmdb_id: 1399, media_type: "tv", status: "watching", title: "House of the Dragon",
    poster_path: "/mock/poster.jpg", backdrop_path: "/mock/backdrop.jpg",
    release_date: "2022-08-21", current_season: 2, current_episode: 4, total_seasons: 2,
  },
  {
    tmdb_id: 1400, media_type: "tv", status: "watching", title: "One Piece",
    poster_path: "/mock/poster.jpg", backdrop_path: "/mock/backdrop.jpg",
    release_date: "2023-08-31", current_season: 1, current_episode: 22, total_seasons: 1,
  },
  {
    tmdb_id: 1401, media_type: "tv", status: "completed", title: "Stranger Things",
    poster_path: "/mock/poster.jpg", backdrop_path: "/mock/backdrop.jpg",
    release_date: "2016-07-15", current_season: 4, current_episode: 9, total_seasons: 5,
  },
  {
    tmdb_id: 693134, media_type: "movie", status: "planned", title: "Duna: Parte 2",
    poster_path: "/mock/poster.jpg", backdrop_path: "/mock/backdrop.jpg",
    release_date: "2024-03-01", current_season: 1, current_episode: 0, total_seasons: null,
  },
  {
    tmdb_id: 693136, media_type: "movie", status: "completed", title: "Interestelar",
    poster_path: "/mock/poster.jpg", backdrop_path: "/mock/backdrop.jpg",
    release_date: "2014-11-07", current_season: 1, current_episode: 0, total_seasons: null,
  },
  {
    tmdb_id: 693138, media_type: "movie", status: "planned", title: "Avatar 3",
    poster_path: "/mock/poster.jpg", backdrop_path: "/mock/backdrop.jpg",
    release_date: "2026-11-19", current_season: 1, current_episode: 0, total_seasons: null,
  },
];

export async function seedDemoLibraryOnce() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEED_KEY)) return;
  if (process.env.NEXT_PUBLIC_TMDB_MOCK !== "1") {
    localStorage.setItem(SEED_KEY, "skipped");
    return;
  }
  const c = createClient();
  if (!c) return;
  const { data } = await c.auth.getSession();
  if (!data.session) return;
  try {
    const userId = data.session!.user.id;
    const { data: existing } = await c
      .from("library")
      .select("tmdb_id, media_type")
      .eq("user_id", userId);
    const have = new Set((existing ?? []).map((r: { tmdb_id: number; media_type: string }) => `${r.tmdb_id}-${r.media_type}`));
    const rows = SEED.filter((s) => !have.has(`${s.tmdb_id}-${s.media_type}`)).map((s) => ({
      ...s,
      user_id: userId,
      runtime_minutes: s.media_type === "movie" ? 130 : null,
      last_watched_at: s.status === "watching" ? new Date().toISOString() : null,
    }));
    if (rows.length > 0) {
      const inserted = await c.from("library").insert(rows).select("id, tmdb_id, media_type, current_season, current_episode");
      if (inserted.data) {
        const year = new Date().getFullYear();
const watchedRows: {
              user_id: string;
              library_id: string;
              season: number;
              episode: number;
              runtime_minutes: number;
              watched_at: string;
            }[] = [];
          for (const lib of inserted.data as {
              id: string;
              tmdb_id: number;
              media_type: string;
              current_season: number;
              current_episode: number;
            }[]) {
          if (lib.media_type !== "tv") continue;
          const seedItem = SEED.find((s) => s.tmdb_id === lib.tmdb_id);
          let count = seedItem?.current_episode ?? 0;
          if (count > 30) count = 30;
          for (let i = 1; i <= count; i++) {
            const dayOff = -Math.floor((count - i) * 1.2) - Math.floor(Math.random() * 4);
            const watchedAt = new Date();
            watchedAt.setDate(watchedAt.getDate() + dayOff);
            if (watchedAt.getFullYear() !== year) continue;
            watchedRows.push({
              user_id: userId,
              library_id: lib.id,
              season: lib.current_season,
              episode: i,
              runtime_minutes: 45,
              watched_at: watchedAt.toISOString(),
            });
          }
        }
        if (watchedRows.length > 0) {
          await c.from("watched_episodes").insert(watchedRows);
        }
      }
    }
    localStorage.setItem(SEED_KEY, "1");
  } catch (e) {
    console.warn("seed failed", e);
  }
}