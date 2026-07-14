import { NextRequest, NextResponse } from "next/server";
import { tmdb } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  if (!q.trim()) return NextResponse.json({ results: [], total_pages: 0 });
  try {
    const data = await tmdb.searchMulti(q, page);
    const filtered = data.results.filter(
      (r) => r.media_type === "tv" || r.media_type === "movie",
    );
    return NextResponse.json({ results: filtered, total_pages: data.total_pages });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}