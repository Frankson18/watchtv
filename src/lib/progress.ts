import type { LibraryItem, TmdbTv } from "./types";

export type ProgressState =
  | "planned"
  | "watching"
  | "up_to_date"
  | "completed"
  | "dropped";

export interface NextEpisode {
  season: number;
  episode: number;
}

export const PROGRESS: Record<ProgressState, { label: string; color: string }> = {
  planned: { label: "Para ver", color: "#A8A8B0" },
  watching: { label: "Assistindo", color: "#F24E4E" },
  up_to_date: { label: "Em dia", color: "#5BD68F" },
  completed: { label: "Concluída", color: "#6A6A72" },
  dropped: { label: "Abandonada", color: "#F5A623" },
};

/** A série ainda vai lançar episódios/temporadas? */
export function isReturning(tv: TmdbTv | null | undefined): boolean {
  if (!tv?.status) return true;
  return !/ended|canceled/i.test(tv.status);
}

/**
 * Primeiro episódio já exibido que o usuário ainda não assistiu.
 * Retorna null quando está em dia/concluído (nada pendente no ar).
 */
export function firstUnwatchedEpisode(
  tv: TmdbTv | null | undefined,
  curSeason: number,
  curEpisode: number,
): NextEpisode | null {
  const last = tv?.last_episode_to_air;
  if (!tv || !last) return null;

  const seasons = (tv.seasons ?? [])
    .filter((s) => s.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number);

  for (const s of seasons) {
    const count = s.episode_count ?? 0;
    for (let ep = 1; ep <= count; ep++) {
      const aired =
        s.season_number < last.season_number ||
        (s.season_number === last.season_number && ep <= last.episode_number);
      if (!aired) return null;
      const unwatched =
        s.season_number > curSeason || (s.season_number === curSeason && ep > curEpisode);
      if (unwatched) return { season: s.season_number, episode: ep };
    }
  }
  return null;
}

/** Estado de progresso exibido (séries). */
export function deriveProgress(item: LibraryItem, tv: TmdbTv | null | undefined): ProgressState {
  if (item.status === "dropped") return "dropped";
  if (item.status === "planned" && item.current_episode === 0) return "planned";
  if (!tv) return item.current_episode > 0 ? "watching" : "planned";

  const next = firstUnwatchedEpisode(tv, item.current_season, item.current_episode);
  if (next) return "watching";
  return isReturning(tv) ? "up_to_date" : "completed";
}

/** Há uma temporada nova (o próximo episódio é de uma temporada além da atual)? */
export function hasNewSeason(
  item: LibraryItem,
  tv: TmdbTv | null | undefined,
): boolean {
  if (item.status === "dropped") return false;
  const next = firstUnwatchedEpisode(tv, item.current_season, item.current_episode);
  return !!next && next.season > item.current_season;
}
