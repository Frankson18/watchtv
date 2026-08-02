"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/use-auth";
import { seedDemoLibraryOnce } from "@/lib/seed";
import { backfillRealImagesOnce } from "@/lib/backfill";
import { mutate } from "swr";
import {
  Play,
  Layers,
  CalendarDays,
  Film,
  User,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/assistindo", label: "Assistindo", icon: Play },
  { href: "/temporadas", label: "Temporadas", icon: Layers },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/filmes", label: "Filmes", icon: Film },
  { href: "/perfil", label: "Perfil", icon: User },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading, configured } = useAuth();
  const mockMode = process.env.NEXT_PUBLIC_TMDB_MOCK === "1";
  const seededRef = useRef(false);
  const redirectingRef = useRef(false);
  const isUserId = user?.id;

  useEffect(() => {
    if (loading) return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (!user && !redirectingRef.current) {
      redirectingRef.current = true;
      // Hard reload em vez de router.replace: garante que useAuth monte limpo
      // e leia a session dos cookies sem race conditions client-side
      window.location.href = "/login";
    }
  }, [loading, isUserId]);

  useEffect(() => {
    if (!isUserId || seededRef.current) return;
    seededRef.current = true;
    seedDemoLibraryOnce().then(() => {
      backfillRealImagesOnce().then(() => {
        mutate("watching");
        mutate("library-tv");
        mutate("library-movie");
        mutate("library-all");
      });
    });
  }, [isUserId]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  if (!configured) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-bold">Configuração pendente</h1>
        <p className="text-text-secondary text-sm">
          Defina <code className="text-accent">NEXT_PUBLIC_SUPABASE_URL</code>,
          <code className="text-accent"> NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e
          <code className="text-accent"> TMDB_API_KEY</code> no arquivo
          <code className="text-accent"> .env.local</code>. Veja o README para
          detalhes.
        </p>
      </main>
    );
  }

  if (loading || !user) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <header className="flex items-center justify-between px-5 pt-3 pb-1 safe-top">
        <Link href="/assistindo" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-text-primary font-black text-base">
            W
          </div>
          <span className="text-lg font-bold tracking-tight">WatchTV</span>
        </Link>
        <Link href="/buscar" className="w-9 h-9 rounded-full bg-bg-elev-2 border border-border flex items-center justify-center text-text-primary active:scale-95" aria-label="Buscar">
          <Search className="w-4 h-4" />
        </Link>
      </header>
      {mockMode && (
        <div className="mx-4 mt-2 mb-1 px-3 py-1.5 rounded-lg bg-warning/15 border border-warning/40 text-warning text-[11px] font-medium text-center">
          Modo demo: dados fictícios do TMDB. Configure{" "}
          <code className="text-warning">TMDB_API_KEY</code> no{" "}
          <code className="text-warning">.env.local</code> para ativar o catálogo real.
        </div>
      )}

      <main className="flex-1 min-h-0 flex flex-col">{children}</main>

      <nav className="sticky bottom-0 px-3 pt-2 pb-3 safe-bottom bg-gradient-to-t from-bg via-bg to-bg/0">
        <div className="flex items-center justify-between gap-1 rounded-full bg-bg-elev-2 border border-border p-1.5 shadow-lg shadow-black/50">
          {TABS.map((t) => {
            const active =
              pathname === t.href || pathname.startsWith(t.href + "/");
            return (
              <Link
                key={t.href}
                href={t.href}
                className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-full transition-colors flex-1"
                style={
                  active
                    ? { backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, transparent)" }
                    : undefined
                }
              >
                <t.icon
                  className="w-[22px] h-[22px]"
                  style={{ color: active ? "var(--color-accent)" : "var(--color-text-tertiary)" }}
                  fill={active ? "currentColor" : "none"}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{
                    color: active ? "var(--color-accent)" : "var(--color-text-tertiary)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}