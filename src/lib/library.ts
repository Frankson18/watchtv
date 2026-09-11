import { createClient } from "./supabase";
import type { LibraryItem, MediaType, MediaStatus, WatchedEpisode } from "./types";
import { tmdbApiUrl, isMockMode } from "./tmdb-config";

type Sb = NonNullable<ReturnType<typeof createClient>>;

let client: Sb | null = null;
function sb(): Sb | null {
  if (!client) client = createClient();
  return client;
}

async function sbAuthed(): Promise<Sb | null> {
  const c = sb();
  if (!c) return null;
  return c;
}

export async function listLibrary(filter?: {
  status?: MediaStatus;
  mediaType?: MediaType;
}): Promise<LibraryItem[]> {
  const c = await sbAuthed();
  if (!c) return [];
  let q = c.from("library").select("*").order("updated_at", { ascending: false });
  if (filter?.status) q = q.eq("status", filter.status);
  if (filter?.mediaType) q = q.eq("media_type", filter.mediaType);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LibraryItem[];
}

export async function listWatching(): Promise<LibraryItem[]> {
  const c = await sbAuthed();
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
  const c = await sbAuthed();
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
  const c = await sbAuthed();
  if (!c) return;
  await c.from("library").update({ status }).eq("id", id);
}

export async function startSeason(libraryId: string, season: number): Promise<void> {
  const c = await sbAuthed();
  if (!c) return;
  const { error } = await c
    .from("library")
    .update({ status: "watching", current_season: season, current_episode: 0 })
    .eq("id", libraryId);
  if (error) throw error;
}

export async function markSeasonWatched(
  libraryId: string,
  season: number,
  episodeCount: number,
): Promise<void> {
  const c = await sbAuthed();
  if (!c) return;
  const now = new Date().toISOString();
  const rows = Array.from({ length: Math.max(0, episodeCount) }, (_, i) => ({
    library_id: libraryId,
    season,
    episode: i + 1,
    watch_count: 1,
    watched_at: now,
  }));
  if (rows.length > 0) {
    const { error } = await c
      .from("watched_episodes")
      .upsert(rows, { onConflict: "library_id,season,episode", ignoreDuplicates: true });
    if (error) throw error;
  }
  const { error: libErr } = await c
    .from("library")
    .update({
      status: "watching",
      current_season: season,
      current_episode: episodeCount,
      last_watched_at: now,
    })
    .eq("id", libraryId);
  if (libErr) throw libErr;
}

export async function removeFromLibrary(id: string): Promise<void> {
  const c = await sbAuthed();
  if (!c) return;
  await c.from("library").delete().eq("id", id);
}

export async function markEpisode(
  libraryId: string,
  season: number,
  episode: number,
  tmdbId?: number,
): Promise<void> {
  const c = await sbAuthed();
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
    if (tmdbId && !isMockMode()) {
      try {
        const r = await fetch(tmdbApiUrl(`/tv/${tmdbId}/season/${season}/episode/${episode}`));
        if (r.ok) {
          const ep = await r.json();
          runtime = typeof ep.runtime === "number" ? ep.runtime : null;
        }
      } catch {}
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
      status: "watching",
      current_season: season,
      current_episode: episode,
      last_watched_at: new Date().toISOString(),
    })
    .eq("id", libraryId);
  if (libErr) throw libErr;
}

export async function unmarkEpisode(
  libraryId: string,
  season: number,
  episode: number,
): Promise<void> {
  const c = await sbAuthed();
  if (!c) return;
  const { error } = await c
    .from("watched_episodes")
    .delete()
    .eq("library_id", libraryId)
    .eq("season", season)
    .eq("episode", episode);
  if (error) throw error;
  const { data } = await c
    .from("watched_episodes")
    .select("episode")
    .eq("library_id", libraryId)
    .eq("season", season)
    .order("episode", { ascending: false })
    .limit(1);
  const maxEp = data && data.length ? (data[0] as { episode: number }).episode : 0;
  const { error: libErr } = await c
    .from("library")
    .update({ current_episode: maxEp })
    .eq("id", libraryId);
  if (libErr) throw libErr;
}

export async function rewatchEpisode(
  libraryId: string,
  season: number,
  episode: number,
): Promise<void> {
  const c = await sbAuthed();
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

export async function markMovieWatched(
  libraryId: string,
  tmdbId: number,
): Promise<void> {
  const c = await sbAuthed();
  if (!c) return;
  let runtime: number | null = null;
  if (!isMockMode()) {
    try {
      const r = await fetch(tmdbApiUrl(`/movie/${tmdbId}`));
      if (r.ok) {
        const m = await r.json();
        runtime = typeof m.runtime === "number" ? m.runtime : null;
      }
    } catch {}
  }
  const { error } = await c
    .from("library")
    .update({ status: "completed", runtime_minutes: runtime })
    .eq("id", libraryId);
  if (error) throw error;
}

export async function rewatchMovie(libraryId: string): Promise<void> {
  const c = await sbAuthed();
  if (!c) return;
  const { error } = await c
    .from("library")
    .update({ last_watched_at: new Date().toISOString() })
    .eq("id", libraryId);
  if (error) throw error;
}

export async function listWatched(libraryId: string, season: number): Promise<WatchedEpisode[]> {
  const c = await sbAuthed();
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

export interface RecentWatchedEntry {
  id: string;
  library_id: string;
  season: number;
  episode: number;
  watched_at: string;
  watch_count: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  media_type: MediaType;
}

export async function listRecentWatched(limit = 20, offset = 0): Promise<RecentWatchedEntry[]> {
  const c = await sbAuthed();
  if (!c) return [];
  const { data: eps, error } = await c
    .from("watched_episodes")
    .select("id, library_id, season, episode, watched_at, watch_count")
    .order("watched_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  const rows = (eps ?? []) as Pick<
    WatchedEpisode,
    "id" | "library_id" | "season" | "episode" | "watched_at" | "watch_count"
  >[];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.library_id))];
  const { data: libs, error: libErr } = await c
    .from("library")
    .select("id, tmdb_id, title, poster_path, media_type")
    .in("id", ids);
  if (libErr) throw libErr;
  const libById = new Map(
    ((libs ?? []) as Pick<
      LibraryItem,
      "id" | "tmdb_id" | "title" | "poster_path" | "media_type"
    >[]).map((l) => [l.id, l] as const),
  );

  return rows.flatMap((r) => {
    const l = libById.get(r.library_id);
    if (!l) return [];
    return [{
      id: r.id,
      library_id: r.library_id,
      season: r.season,
      episode: r.episode,
      watched_at: r.watched_at,
      watch_count: r.watch_count ?? 1,
      tmdb_id: l.tmdb_id,
      title: l.title,
      poster_path: l.poster_path ?? null,
      media_type: l.media_type,
    }];
  });
}