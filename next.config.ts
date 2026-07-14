import type { NextConfig } from "next";

const tmdbMockMode =
  !process.env.TMDB_API_KEY || process.env.TMDB_API_KEY.trim() === "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_TMDB_MOCK: tmdbMockMode ? "1" : "0",
  },
};

export default nextConfig;