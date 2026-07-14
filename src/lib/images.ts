const BASE = process.env.TMDB_IMAGE_BASE_URL ?? "https://image.tmdb.org/t/p";
const USE_MOCK = process.env.NEXT_PUBLIC_TMDB_MOCK === "1";

export function posterUrl(
  path: string | null,
  size: "w92" | "w154" | "w185" | "w342" | "w500" = "w185",
) {
  if (!path) return null;
  if (USE_MOCK) return "/mock/poster.jpg";
  if (path.startsWith("/mock/")) return null;
  return `${BASE}/${size}${path}`;
}

export function backdropUrl(
  path: string | null,
  size: "w300" | "w780" | "w1280" = "w780",
) {
  if (!path) return null;
  if (USE_MOCK) return "/mock/backdrop.jpg";
  if (path.startsWith("/mock/")) return null;
  return `${BASE}/${size}${path}`;
}

export function stillUrl(
  path: string | null,
  size: "w185" | "w300" = "w300",
) {
  if (!path) return null;
  if (USE_MOCK) return "/mock/poster.jpg";
  if (path.startsWith("/mock/")) return null;
  return `${BASE}/${size}${path}`;
}