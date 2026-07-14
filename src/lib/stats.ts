"use client";

import { createClient } from "./supabase-client";
import type { LibraryItem, WatchedEpisode } from "./types";

type Sb = NonNullable<ReturnType<typeof createClient>>;
async function sb(): Promise<Sb | null> {
  const c = createClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  if (!data.session) return null;
  return c;
}

export interface Stats {
  showsWatching: number;
  animesWatching: number;
  moviesWatched: number;
  episodesTotal: number;
  durationTvMinutes: number;
  durationMoviesMinutes: number;
  rewatchTotal: number;
  topGenres: string[];
}

export interface RecentActivity {
  id: string;
  title: string;
  poster_path: string | null;
  season: number;
  episode: number;
  watched_at: string;
  media_type: "tv" | "movie";
  watch_count: number;
}

export interface ContributionDay {
  date: string;
  count: number;
}

export function formatDuration(minutes: number): string {
  const totalMin = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMin / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years}a`);
  const remMonths = months - years * 12;
  if (remMonths > 0) parts.push(`${remMonths}m`);
  const remDays = days - months * 30;
  if (remDays > 0) parts.push(`${remDays}d`);
  if (days === 0 && hours > 0) parts.push(`${hours}h`);
  if (parts.length === 0) parts.push("0d");
  return parts.join(" ");
}

export async function getStats(): Promise<Stats> {
  const c = await sb();
  if (!c) return zero();
  const { data: lib } = await c.from("library").select("*");
  const items = (lib ?? []) as LibraryItem[];
  const showsWatching = items.filter(
    (i) => i.media_type === "tv" && i.status === "watching",
  ).length;
  const animesWatching = showsWatching;
  const moviesWatched = items.filter(
    (i) => i.media_type === "movie" && i.status === "completed",
  ).length;

  const { data: eps } = await c.from("watched_episodes").select("*");
  const watched = (eps ?? []) as WatchedEpisode[];
  const episodesTotal = watched.length;
  const minsTv = watched.reduce(
    (acc, e) => acc + (e.runtime_minutes ?? 45) * (e.watch_count ?? 1),
    0,
  );
  const minsMovies = items
    .filter((i) => i.media_type === "movie" && i.status === "completed")
    .reduce((acc, i) => acc + (i.runtime_minutes ?? 120), 0);
  const rewatchTotal = watched.reduce(
    (acc, e) => acc + Math.max(0, (e.watch_count ?? 1) - 1),
    0,
  );

  const genreCount = new Map<string, number>();
  for (const it of items) {
    const gm = fetchGenresFromCache(it.tmdb_id);
    for (const g of gm) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
  }
  const topGenres = [...genreCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((e) => e[0]);

  return {
    showsWatching,
    animesWatching,
    moviesWatched,
    episodesTotal,
    durationTvMinutes: minsTv,
    durationMoviesMinutes: minsMovies,
    rewatchTotal,
    topGenres,
  };
}

const genreCache = new Map<number, string[]>();
function fetchGenresFromCache(tmdbId: number): string[] {
  return genreCache.get(tmdbId) ?? [];
}
export function primeGenreCache(tmdbId: number, genres: string[]) {
  genreCache.set(tmdbId, genres);
}

export async function getRecentActivity(limit = 5): Promise<RecentActivity[]> {
  const c = await sb();
  if (!c) return [];
  const { data: lib } = await c.from("library").select("*");
  const items = (lib ?? []) as LibraryItem[];
  const libById = new Map(items.map((i) => [i.id, i] as const));

  const { data: eps } = await c
    .from("watched_episodes")
    .select("*")
    .order("watched_at", { ascending: false })
    .limit(limit * 3);
  const watched = (eps ?? []) as WatchedEpisode[];

  const merged: RecentActivity[] = [];
  const seen = new Set<string>();
  for (const e of watched) {
    const item = libById.get(e.library_id);
    if (!item) continue;
    const key = `${item.id}-${e.season}-${e.episode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: e.id,
      title: item.title,
      poster_path: item.poster_path,
      season: e.season,
      episode: e.episode,
      watched_at: e.watched_at,
      media_type: item.media_type,
      watch_count: e.watch_count ?? 1,
    });
    if (merged.length >= limit) break;
  }

  const movies = items
    .filter((i) => i.media_type === "movie" && i.status === "completed")
    .sort((a, b) =>
      (b.last_watched_at ?? b.updated_at).localeCompare(
        a.last_watched_at ?? a.updated_at,
      ),
    )
    .slice(0, limit);
  for (const m of movies) {
    if (merged.find((r) => r.title === m.title)) continue;
    merged.push({
      id: m.id,
      title: m.title,
      poster_path: m.poster_path,
      season: 0,
      episode: 0,
      watched_at: m.last_watched_at ?? m.updated_at,
      media_type: "movie",
      watch_count: 1,
    });
  }
  merged.sort((a, b) => b.watched_at.localeCompare(a.watched_at));
  return merged.slice(0, limit);
}

export async function getContributionData(
  year: number,
): Promise<ContributionDay[]> {
  const c = await sb();
  if (!c) return [];
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const { data: eps } = await c
    .from("watched_episodes")
    .select("watched_at")
    .gte("watched_at", start)
    .lte("watched_at", end + "T23:59:59");
  const watched = (eps ?? []) as Pick<WatchedEpisode, "watched_at">[];

  const { data: lib } = await c.from("library").select("*");
  const items = (lib ?? []) as LibraryItem[];
  const movies = items
    .filter(
      (i) =>
        i.media_type === "movie" &&
        i.status === "completed" &&
        i.last_watched_at,
    )
    .map((i) => ({ watched_at: i.last_watched_at as string }));

  const all = [
    ...watched.map((e) => e.watched_at),
    ...movies.map((m) => m.watched_at),
  ].filter((d) => d.startsWith(String(year)));

  const map = new Map<string, number>();
  for (const d of all) {
    const key = d.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  const out: ContributionDay[] = [];
  const d = new Date(year, 0, 1);
  for (let i = 0; i < 366; i++) {
    if (d.getFullYear() !== year) break;
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, count: map.get(iso) ?? 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function zero(): Stats {
  return {
    showsWatching: 0,
    animesWatching: 0,
    moviesWatched: 0,
    episodesTotal: 0,
    durationTvMinutes: 0,
    durationMoviesMinutes: 0,
    rewatchTotal: 0,
    topGenres: [],
  };
}