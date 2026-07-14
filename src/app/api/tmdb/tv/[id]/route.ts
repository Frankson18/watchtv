import { NextRequest, NextResponse } from "next/server";
import { tmdb } from "@/lib/tmdb";

// GET /api/tmdb/tv/[id]?seasons=N  -> dados da série + opcionalmente temporada atual
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/tmdb/tv/[id]">,
) {
  const id = Number((await ctx.params).id);
  try {
    const tv = await tmdb.tv(id);
    return NextResponse.json(tv);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}