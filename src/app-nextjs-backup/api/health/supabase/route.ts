import { NextResponse } from "next/server";
import { createServerClientInstance } from "@/lib/supabase-server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !hasKey) {
    return NextResponse.json({
      ok: false,
      step: "env",
      message:
        "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local",
      url: url ?? null,
      hasKey,
    });
  }

  try {
    const sb = await createServerClientInstance();
    if (!sb) {
      return NextResponse.json({ ok: false, step: "client", message: "Falhou criar client" });
    }
    const { data: authData, error: authErr } = await sb.auth.getSession();
    if (authErr) {
      return NextResponse.json({ ok: false, step: "auth", message: authErr.message });
    }
    const userId = authData.session?.user?.id ?? null;

    const libRes = await sb.from("library").select("id", { count: "exact", head: true });
    const watchedRes = await sb.from("watched_episodes").select("id", { count: "exact", head: true });

    const tableMissing = (name: string, err: { message?: string } | null) =>
      err && /Could not find the table|relation .* does not exist|Could not find the relation/i.test(
        err.message ?? "",
      )
        ? `Tabela ${name} não existe. Rode supabase/schema.sql no SQL Editor.`
        : null;

    const missingLib = tableMissing("library", libRes.error);
    const missingWat = tableMissing("watched_episodes", watchedRes.error);

    if (missingLib || missingWat) {
      return NextResponse.json({
        ok: false,
        step: "tables_exist",
        message: missingLib ?? missingWat,
        library_error: libRes.error?.message ?? null,
        watched_error: watchedRes.error?.message ?? null,
      });
    }

    if (libRes.error && /policy|permission|rls/i.test(libRes.error.message ?? "")) {
      return NextResponse.json({
        ok: false,
        step: "rls",
        message:
          "RLS bloqueia acesso à tabela library. Rode supabase/schema.sql no SQL Editor (cria as policies).",
        error: libRes.error.message,
      });
    }

    return NextResponse.json({
      ok: !libRes.error && !watchedRes.error,
      step: "ready",
      user_id: userId,
      signed_in: !!userId,
      library_count: libRes.count ?? 0,
      library_error: libRes.error?.message ?? null,
      watched_error: watchedRes.error?.message ?? null,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, step: "exception", message: (e as Error).message });
  }
}