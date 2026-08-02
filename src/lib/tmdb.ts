import type {
  TmdbSearchResult,
  TmdbSeason,
  TmdbTv,
  TmdbMovie,
  TmdbEpisode,
} from "./types";
import { mockTmdb, tmdbIsMock } from "./tmdb-mock";
import { tmdbApiUrl, tmdbHeaders } from "./tmdb-config";

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = tmdbApiUrl(path, params);
  const headers = tmdbHeaders();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export function isMockMode() {
  return tmdbIsMock();
}

export const tmdb = {
  searchMulti: (query: string, page = 1) =>
    tmdbIsMock()
      ? mockTmdb.searchMulti(query)
      : tmdbFetch<{ results: TmdbSearchResult[]; total_pages: number }>("/search/multi", {
          query,
          page,
        }),

  tv: (id: number) =>
    tmdbIsMock()
      ? mockTmdb.tv(id)
      : tmdbFetch<TmdbTv>(`/tv/${id}`, { append_to_response: "credits" }),

  tvSeason: (id: number, season: number) =>
    tmdbIsMock()
      ? mockTmdb.tvSeason(id, season)
      : tmdbFetch<TmdbSeason>(`/tv/${id}/season/${season}`),

  tvEpisode: (id: number, season: number, episode: number) =>
    tmdbIsMock()
      ? mockTmdb.tvEpisode(id, season, episode)
      : tmdbFetch<TmdbEpisode>(`/tv/${id}/season/${season}/episode/${episode}`),

  movie: (id: number) =>
    tmdbIsMock()
      ? mockTmdb.movie(id)
      : tmdbFetch<TmdbMovie>(`/movie/${id}`, { append_to_response: "credits" }),

  trending: (window: "day" | "week" = "week") =>
    tmdbIsMock()
      ? mockTmdb.trending()
      : tmdbFetch<{ results: TmdbSearchResult[] }>("/trending/all/" + window),

  popularMovies: (page = 1) =>
    tmdbIsMock()
      ? mockTmdb.popularMovies()
      : tmdbFetch<{ results: TmdbSearchResult[] }>("/movie/popular", { page }),

  popularTv: (page = 1) =>
    tmdbIsMock()
      ? mockTmdb.popularTv()
      : tmdbFetch<{ results: TmdbSearchResult[] }>("/tv/popular", { page }),
};