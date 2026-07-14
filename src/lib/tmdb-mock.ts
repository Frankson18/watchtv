import type {
  TmdbSearchResult,
  TmdbSeason,
  TmdbTv,
  TmdbMovie,
  TmdbCredits,
} from "./types";

const now = new Date();
function daysFromNow(d: number): string {
  const dt = new Date(now.getTime() + d * 86400000);
  return dt.toISOString().slice(0, 10);
}

const POSTER = "/mock/poster.jpg";
const BACKDROP = "/mock/backdrop.jpg";

function makeCast(names: [string, string][]): TmdbCredits {
  return {
    cast: names.slice(0, 8).map(([name, character], i) => ({
      id: i,
      name,
      character,
      profile_path: null,
    })),
  };
}

const GENERIC_TV_CAST: [string, string][] = [
  ["Adam Scott", "Mark"],
  ["Patricia Arquette", "Ms. Cobel"],
  ["John Turturro", "Irving"],
  ["Britt Lower", "Helly"],
  ["Zach Cherry", "Dylan"],
  ["Michael Buonagurio", "Atendente"],
];

const GENERIC_MOVIE_CAST: [string, string][] = [
  ["Timothée Chalamet", "Paul"],
  ["Zendaya", "Chani"],
  ["Rebecca Ferguson", "Lady Jessica"],
  ["Oscar Isaac", "Leto"],
  ["Josh Brolin", "Gurney"],
];

function makeEpisode(season: number, ep: number, airOffset: number | null) {
  return {
    id: season * 1000 + ep,
    season_number: season,
    episode_number: ep,
    name: `Episódio ${ep}`,
    air_date: airOffset === null ? null : daysFromNow(airOffset),
    still_path: null,
    runtime: 45,
    overview: `Resumo fictício do episódio ${ep} da temporada ${season}.`,
  };
}

function makeSeason(season: number, epCount: number, airDateOffset: number | null) {
  return {
    id: season,
    season_number: season,
    episode_count: epCount,
    air_date: airDateOffset === null ? null : daysFromNow(airDateOffset),
    name: `Temporada ${season}`,
    episodes: Array.from({ length: epCount }, (_, i) =>
      makeEpisode(season, i + 1, airDateOffset === null ? null : airDateOffset + i),
    ),
  };
}

const TV_SHOWS: TmdbTv[] = [
  {
    id: 1399,
    name: "House of the Dragon",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    first_air_date: "2022-08-21",
    number_of_seasons: 2,
    number_of_episodes: 18,
    seasons: [makeSeason(1, 10, -800), makeSeason(2, 8, -30)],
    last_episode_to_air: makeEpisode(2, 4, -7),
    next_episode_to_air: makeEpisode(2, 5, 3),
    genres: [{ id: 1, name: "Drama" }],
    overview: "A dança dos dragões, 200 anos antes de Game of Thrones.",
  },
  {
    id: 1396,
    name: "Severance",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    first_air_date: "2022-02-18",
    number_of_seasons: 2,
    number_of_episodes: 20,
    seasons: [makeSeason(1, 10, -800), makeSeason(2, 10, -10)],
    last_episode_to_air: makeEpisode(2, 5, -2),
    next_episode_to_air: makeEpisode(2, 6, 5),
    genres: [{ id: 2, name: "Suspense" }],
    overview: "Funcionários de uma megacorp têm memórias divididas entre trabalho e casa.",
  },
  {
    id: 1397,
    name: "The Bear",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    first_air_date: "2022-06-22",
    number_of_seasons: 3,
    number_of_episodes: 28,
    seasons: [
      makeSeason(1, 8, -1000),
      makeSeason(2, 10, -500),
      makeSeason(3, 10, -20),
    ],
    last_episode_to_air: makeEpisode(3, 7, -1),
    next_episode_to_air: makeEpisode(3, 8, 7),
    genres: [{ id: 3, name: "Comédia" }],
    overview: "Um chef de cozinha retorna a Chicago para administrar o restaurante da família.",
  },
  {
    id: 1398,
    name: "Shogun",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    first_air_date: "2024-02-27",
    number_of_seasons: 1,
    number_of_episodes: 10,
    seasons: [makeSeason(1, 10, -60)],
    last_episode_to_air: makeEpisode(1, 3, -14),
    next_episode_to_air: makeEpisode(1, 10, 2),
    genres: [{ id: 4, name: "Drama histórico" }],
    overview: "Japão feudal, século XVII. Um navegador inglês se vê no meio de uma guerra civil.",
  },
  {
    id: 1400,
    name: "One Piece",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    first_air_date: "2023-08-31",
    number_of_seasons: 1,
    number_of_episodes: 112,
    seasons: [makeSeason(1, 112, -300)],
    last_episode_to_air: makeEpisode(1, 22, -3),
    next_episode_to_air: makeEpisode(1, 23, 14),
    genres: [{ id: 5, name: "Anime" }],
    overview: "Luffy e os Chapéus de Palha navegam em busca do tesouro definitivo.",
  },
  {
    id: 1401,
    name: "Stranger Things",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    first_air_date: "2016-07-15",
    number_of_seasons: 5,
    number_of_episodes: 40,
    seasons: [
      makeSeason(1, 8, -3000),
      makeSeason(2, 9, -2500),
      makeSeason(3, 8, -1800),
      makeSeason(4, 9, -1200),
      makeSeason(5, 8, 40),
    ],
    last_episode_to_air: makeEpisode(4, 9, -1200),
    next_episode_to_air: null,
    genres: [{ id: 6, name: "Suspense" }],
    overview: "Crianças de Hawkins enfrentam o Mundo Invertido.",
  },
  {
    id: 1402,
    name: "The Last of Us",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    first_air_date: "2023-01-15",
    number_of_seasons: 2,
    number_of_episodes: 19,
    seasons: [makeSeason(1, 9, -900), makeSeason(2, 10, 10)],
    last_episode_to_air: makeEpisode(1, 9, -700),
    next_episode_to_air: makeEpisode(2, 1, 10),
    genres: [{ id: 7, name: "Drama" }],
    overview: "Sobreviventes atravessam um EUA pós-apocalíptico.",
  },
  {
    id: 1403,
    name: "Arcane",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    first_air_date: "2021-11-06",
    number_of_seasons: 2,
    number_of_episodes: 18,
    seasons: [makeSeason(1, 9, -1200), makeSeason(2, 9, -30)],
    last_episode_to_air: makeEpisode(2, 5, -5),
    next_episode_to_air: makeEpisode(2, 6, 10),
    genres: [{ id: 8, name: "Animação" }],
    overview: "Origem de campeãs de League of Legends em Zaun e Piltover.",
  },
];

const MOVIES: TmdbMovie[] = [
  {
    id: 693134,
    title: "Duna: Parte 2",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    release_date: "2024-03-01",
    runtime: 166,
    genres: [{ id: 1, name: "Ficção" }],
    overview: "Paul Atreides une-se aos Fremen para derrubar a Casa Harkonnen.",
  },
  {
    id: 693135,
    title: "Oppenheimer",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    release_date: "2023-07-21",
    runtime: 180,
    genres: [{ id: 2, name: "Drama" }],
    overview: "A história do pai da bomba atômica.",
  },
  {
    id: 693136,
    title: "Interestelar",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    release_date: "2014-11-07",
    runtime: 169,
    genres: [{ id: 3, name: "Aventura" }],
    overview: "A última esperança da humanidade está além das estrelas.",
  },
  {
    id: 693137,
    title: "Arrival",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    release_date: "2016-11-23",
    runtime: 116,
    genres: [{ id: 4, name: "Suspense" }],
    overview: "Uma linguista tenta se comunicar com alienígenas recém-chegados.",
  },
  {
    id: 693138,
    title: "Avatar 3",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    release_date: daysFromNow(120),
    runtime: 190,
    genres: [{ id: 5, name: "Ficção" }],
    overview: "A terceira incursão de James Cameron em Pandora.",
  },
  {
    id: 693139,
    title: "Minecraft: O Filme",
    poster_path: POSTER,
    backdrop_path: BACKDROP,
    release_date: daysFromNow(200),
    runtime: 100,
    genres: [{ id: 6, name: "Aventura" }],
    overview: "Adaptação do jogo mais vendido do mundo.",
  },
];

function tvToResult(tv: TmdbTv): TmdbSearchResult {
  return {
    id: tv.id,
    media_type: "tv",
    name: tv.name,
    title: undefined,
    poster_path: tv.poster_path,
    backdrop_path: tv.backdrop_path,
    first_air_date: tv.first_air_date,
    release_date: undefined,
    overview: tv.overview,
    vote_average: 8.5,
  };
}

function movieToResult(m: TmdbMovie): TmdbSearchResult {
  return {
    id: m.id,
    media_type: "movie",
    name: undefined,
    title: m.title,
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
    first_air_date: undefined,
    release_date: m.release_date,
    overview: m.overview,
    vote_average: 8.0,
  };
}

const ALL_RESULTS = [...TV_SHOWS.map(tvToResult), ...MOVIES.map(movieToResult)];

const mock = {
  searchMulti: async (query: string) => {
    const q = query.toLowerCase();
    const results = ALL_RESULTS.filter((r) =>
      (r.name ?? r.title ?? "").toLowerCase().includes(q),
    );
    return { results, total_pages: 1 };
  },

  tv: async (id: number) => {
    const t = TV_SHOWS.find((s) => s.id === id);
    if (!t) throw new Error("Série não encontrada (mock)");
    return { ...t, credits: makeCast(GENERIC_TV_CAST) };
  },

  tvSeason: async (id: number, season: number) => {
    const t = TV_SHOWS.find((s) => s.id === id);
    if (!t) throw new Error("Série não encontrada (mock)");
    const s = t.seasons.find((sn) => sn.season_number === season);
    if (!s) throw new Error("Temporada não encontrada (mock)");
    return s as TmdbSeason;
  },

  tvEpisode: async (id: number, season: number, episode: number) => {
    const t = TV_SHOWS.find((s) => s.id === id);
    if (!t) throw new Error("Série não encontrada (mock)");
    const s = t.seasons.find((sn) => sn.season_number === season);
    if (!s) throw new Error("Temporada não encontrada (mock)");
    const e = (s.episodes ?? []).find((ep) => ep.episode_number === episode);
    if (!e) throw new Error("Episódio não encontrado (mock)");
    return e;
  },

  movie: async (id: number) => {
    const m = MOVIES.find((mo) => mo.id === id);
    if (!m) throw new Error("Filme não encontrado (mock)");
    return { ...m, credits: makeCast(GENERIC_MOVIE_CAST) };
  },

  trending: async () => ({ results: ALL_RESULTS.slice(0, 8) }),
  popularMovies: async () => ({ results: MOVIES.map(movieToResult) }),
  popularTv: async () => ({ results: TV_SHOWS.map(tvToResult) }),
};

export function tmdbIsMock() {
  return !process.env.TMDB_API_KEY || process.env.TMDB_API_KEY.trim() === "";
}

export { mock as mockTmdb };