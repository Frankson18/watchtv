"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sb = createClient();

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/assistindo";
    });
  }, [sb]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!sb) {
      setError("Supabase não configurado. Veja o README.");
      return;
    }
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // Força reload completo: AppLayout monta limpo e lê a session dos cookies
    window.location.href = "/assistindo";
  }

  return (
    <Shell title="Entrar" subtitle="Bem-vindo de volta ao seu tracking">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="E-mail">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className={inputCls}
            required
          />
        </Field>
        <Field label="Senha">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputCls}
            required
          />
        </Field>
        {error && <p className="text-accent text-sm">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="bg-accent text-text-primary font-semibold py-3 rounded-xl disabled:opacity-50"
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="text-text-secondary text-sm mt-6 text-center">
        Não tem conta?{" "}
        <Link href="/signup" className="text-accent font-medium">
          Criar agora
        </Link>
      </p>
    </Shell>
  );
}

export function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-12 safe-top safe-bottom">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-text-primary font-black text-xl">
          W
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-text-secondary text-sm">{subtitle}</p>
      </div>
      {children}
    </main>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-text-secondary text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "bg-bg-elev border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent";

export { inputCls, Shell as AuthShell, Field as AuthField };