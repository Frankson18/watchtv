import { NextRequest, NextResponse } from "next/server";
import { tmdb } from "@/lib/tmdb";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/tmdb/movie/[id]">,
) {
  const id = Number((await ctx.params).id);
  try {
    const movie = await tmdb.movie(id);
    return NextResponse.json(movie);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}