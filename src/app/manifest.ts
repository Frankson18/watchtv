import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WatchTV — Tracking audiovisual",
    short_name: "WatchTV",
    description:
      "Acompanhe séries, filmes, animes: episódios, calendário de estreias e progresso.",
    start_url: "/assistindo",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B0B0E",
    theme_color: "#0B0B0E",
    categories: ["entertainment", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  } satisfies MetadataRoute.Manifest;
}