import { NextRequest, NextResponse } from "next/server";
import { tmdb } from "@/lib/tmdb";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/tmdb/tv/[id]/season/[season]/episode/[episode]">,
) {
  const id = Number((await ctx.params).id);
  const season = Number((await ctx.params).season);
  const episode = Number((await ctx.params).episode);
  try {
    const data = await tmdb.tvEpisode(id, season, episode);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}