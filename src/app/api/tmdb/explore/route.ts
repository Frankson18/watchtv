import { NextResponse } from "next/server";
import { tmdb } from "@/lib/tmdb";

export async function GET() {
  try {
    const [trend, movies, tv] = await Promise.all([
      tmdb.trending("week"),
      tmdb.popularMovies(),
      tmdb.popularTv(),
    ]);
    return NextResponse.json({ trending: trend.results, movies: movies.results, tv: tv.results });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}