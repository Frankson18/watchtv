import { createClient } from "./supabase";
import type { MediaType } from "./types";

type Sb = NonNullable<ReturnType<typeof createClient>>;
let client: Sb | null = null;
function sb(): Sb | null {
  if (!client) client = createClient();
  return client;
}

export const TITLE_SEASON = 0;
export const TITLE_EPISODE = 0;

export function ratingKey(season: number, episode: number): string {
  return `${season}-${episode}`;
}

/** Retorna um mapa "season-episode" -> nota (0.5..5). Vazio se a tabela não existir. */
export async function getRatingsForTitle(
  tmdbId: number,
  mediaType: MediaType,
): Promise<Record<string, number>> {
  const c = sb();
  if (!c) return {};
  const { data, error } = await c
    .from("ratings")
    .select("season, episode, rating")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType);
  if (error) return {};
  const map: Record<string, number> = {};
  for (const r of (data ?? []) as { season: number; episode: number; rating: number }[]) {
    map[ratingKey(r.season, r.episode)] = Number(r.rating);
  }
  return map;
}

export async function setRating(
  tmdbId: number,
  mediaType: MediaType,
  season: number,
  episode: number,
  rating: number,
): Promise<void> {
  const c = sb();
  if (!c) throw new Error("Sem conexão");
  const { error } = await c
    .from("ratings")
    .upsert(
      { tmdb_id: tmdbId, media_type: mediaType, season, episode, rating },
      { onConflict: "user_id,tmdb_id,media_type,season,episode" },
    );
  if (error) throw error;
}

export async function clearRating(
  tmdbId: number,
  mediaType: MediaType,
  season: number,
  episode: number,
): Promise<void> {
  const c = sb();
  if (!c) return;
  await c
    .from("ratings")
    .delete()
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .eq("season", season)
    .eq("episode", episode);
}
