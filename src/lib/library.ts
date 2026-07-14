"use client";

import { createClient } from "./supabase-client";
import type { LibraryItem, MediaType, MediaStatus, WatchedEpisode } from "./types";

type Sb = NonNullable<ReturnType<typeof createClient>>;
async function sb(): Promise<Sb | null> {
  const c = createClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  if (!data.session) return null;
  return c;
}

export async function listLibrary(filter?: {
  status?: MediaStatus;
  mediaType?: MediaType;
}): Promise<LibraryItem[]> {
  const c = await sb();
  if (!c) return [];
  let q = c.from("library").select("*").order("updated_at", { ascending: false });
  if (filter?.status) q = q.eq("status", filter.status);
  if (filter?.mediaType) q = q.eq("media_type", filter.mediaType);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LibraryItem[];
}

export async function listWatching(): Promise<LibraryItem[]> {
  const c = await sb();
  if (!c) return [];
  const { data, error } = await c
    .from("library")
    .select("*")
    .eq("status", "watching")
    .order("last_watched_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as LibraryItem[];
}

export async function addToLibrary(input: {
  tmdb_id: number;
  media_type: MediaType;
  status?: MediaStatus;
  title: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  total_seasons?: number | null;
}): Promise<LibraryItem | null> {
  const c = await sb();
  if (!c) return null;
  const payload = {
    ...input,
    poster_path: input.poster_path ?? null,
    backdrop_path: input.backdrop_path ?? null,
    release_date: input.release_date ?? null,
    total_seasons: input.total_seasons ?? null,
    status: input.status ?? "watching",
  };

  const { data: existing, error: selErr } = await c
    .from("library")
    .select("id")
    .eq("tmdb_id", payload.tmdb_id)
    .eq("media_type", payload.media_type)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing?.id) {
    const { data, error } = await c
      .from("library")
      .update({
        status: payload.status,
        title: payload.title,
        poster_path: payload.poster_path,
        backdrop_path: payload.backdrop_path,
        release_date: payload.release_date,
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as LibraryItem;
  }

  const { data, error } = await c
    .from("library")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as LibraryItem;
}

export async function setStatus(id: string, status: MediaStatus) {
  const c = await sb();
  if (!c) return;
  await c.from("library").update({ status }).eq("id", id);
}

export async function removeFromLibrary(id: string): Promise<void> {
  const c = await sb();
  if (!c) return;
  await c.from("library").delete().eq("id", id);
}

export async function countWatched(libraryId: string, season: number): Promise<number> {
  const c = await sb();
  if (!c) return 0;
  const { count, error } = await c
    .from("watched_episodes")
    .select("id", { count: "exact", head: true })
    .eq("library_id", libraryId)
    .eq("season", season);
  if (error) throw error;
  return count ?? 0;
}

export async function markEpisode(
  libraryId: string,
  season: number,
  episode: number,
  tmdbId?: number,
): Promise<void> {
  const c = await sb();
  if (!c) return;

  const { data: existing } = await c
    .from("watched_episodes")
    .select("id, watch_count")
    .eq("library_id", libraryId)
    .eq("season", season)
    .eq("episode", episode)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await c
      .from("watched_episodes")
      .update({ watch_count: existing.watch_count + 1, watched_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    let runtime: number | null = null;
    if (tmdbId) {
      try {
        const r = await fetch(`/api/tmdb/tv/${tmdbId}/season/${season}/episode/${episode}`);
        if (r.ok) {
          const ep = await r.json();
          runtime = typeof ep.runtime === "number" ? ep.runtime : null;
        }
      } catch {
        /* ignore — runtime optional */
      }
    }
    const { error } = await c.from("watched_episodes").insert({
      library_id: libraryId,
      season,
      episode,
      runtime_minutes: runtime,
      watch_count: 1,
      watched_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  const { error: libErr } = await c
    .from("library")
    .update({
      current_season: season,
      current_episode: episode,
      last_watched_at: new Date().toISOString(),
    })
    .eq("id", libraryId);
  if (libErr) throw libErr;
}

export async function rewatchEpisode(
  libraryId: string,
  season: number,
  episode: number,
): Promise<void> {
  const c = await sb();
  if (!c) return;
  const { data: existing } = await c
    .from("watched_episodes")
    .select("id, watch_count")
    .eq("library_id", libraryId)
    .eq("season", season)
    .eq("episode", episode)
    .maybeSingle();
  if (!existing?.id) return;
  const { error } = await c
    .from("watched_episodes")
    .update({ watch_count: existing.watch_count + 1, watched_at: new Date().toISOString() })
    .eq("id", existing.id);
  if (error) throw error;
}

export async function unmarkEpisode(
  libraryId: string,
  season: number,
  episode: number,
): Promise<void> {
  const c = await sb();
  if (!c) return;
  await c
    .from("watched_episodes")
    .delete()
    .eq("library_id", libraryId)
    .eq("season", season)
    .eq("episode", episode);
}

export async function markMovieWatched(
  libraryId: string,
  tmdbId: number,
): Promise<void> {
  const c = await sb();
  if (!c) return;
  let runtime: number | null = null;
  try {
    const r = await fetch(`/api/tmdb/movie/${tmdbId}`);
    if (r.ok) {
      const m = await r.json();
      runtime = typeof m.runtime === "number" ? m.runtime : null;
    }
  } catch {
    /* ignore */
  }
  const { error } = await c
    .from("library")
    .update({ status: "completed", runtime_minutes: runtime })
    .eq("id", libraryId);
  if (error) throw error;
}

export async function rewatchMovie(libraryId: string): Promise<void> {
  const c = await sb();
  if (!c) return;
  const { error } = await c
    .from("library")
    .update({
      last_watched_at: new Date().toISOString(),
    })
    .eq("id", libraryId);
  if (error) throw error;
}

export async function listWatched(libraryId: string, season: number): Promise<WatchedEpisode[]> {
  const c = await sb();
  if (!c) return [];
  const { data, error } = await c
    .from("watched_episodes")
    .select("*")
    .eq("library_id", libraryId)
    .eq("season", season)
    .order("episode", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WatchedEpisode[];
}