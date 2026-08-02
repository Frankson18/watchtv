const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? "";

export function isMockMode(): boolean {
  return !TMDB_KEY || TMDB_KEY.trim() === "";
}

export function tmdbApiKey(): string {
  return TMDB_KEY;
}

export function isJwt(key: string): boolean {
  return key.startsWith("eyJ");
}

export function tmdbApiUrl(
  path: string,
  params: Record<string, string | number | undefined> = {},
): string {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", "pt-BR");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  if (!isJwt(TMDB_KEY)) {
    url.searchParams.set("api_key", TMDB_KEY);
  }
  return url.toString();
}

export function tmdbHeaders(): Record<string, string> {
  if (isJwt(TMDB_KEY)) {
    return { Authorization: `Bearer ${TMDB_KEY}` };
  }
  return {};
}

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(
  path: string | null,
  size: "w92" | "w154" | "w185" | "w342" | "w500" = "w185",
): string | null {
  if (!path) return null;
  if (isMockMode()) return require("../../assets/mock-poster.png");
  if (path.startsWith("/mock/")) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(
  path: string | null,
  size: "w300" | "w780" | "w1280" = "w780",
): string | null {
  if (!path) return null;
  if (isMockMode()) return require("../../assets/mock-backdrop.png");
  if (path.startsWith("/mock/")) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}