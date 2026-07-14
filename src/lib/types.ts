export type MediaType = "tv" | "movie";
export type MediaStatus = "watching" | "planned" | "completed" | "dropped";

export interface LibraryItem {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  status: MediaStatus;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime_minutes: number | null;
  current_season: number;
  current_episode: number;
  total_seasons: number | null;
  last_season_air_date: string | null;
  last_watched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WatchedEpisode {
  id: string;
  library_id: string;
  season: number;
  episode: number;
  runtime_minutes: number | null;
  watch_count: number;
  watched_at: string;
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  name: string;
  episodes?: TmdbEpisode[];
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  air_date: string | null;
  still_path: string | null;
  overview: string;
  runtime: number | null;
}

export interface TmdbTv {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: TmdbSeason[];
  last_episode_to_air: TmdbEpisode | null;
  next_episode_to_air: TmdbEpisode | null;
  genres?: { id: number; name: string }[];
  overview: string;
  credits?: TmdbCredits;
}

export interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime: number | null;
  genres?: { id: number; name: string }[];
  overview: string;
  credits?: TmdbCredits;
}

export interface TmdbCredits {
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
  }[];
}

export interface TmdbSearchResult {
  id: number;
  media_type: MediaType | "person";
  name?: string;
  title?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  overview: string;
  vote_average?: number;
}