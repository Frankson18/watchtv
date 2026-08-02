"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import { AuthShell, AuthField, inputCls } from "../login/page";

export default function SignupPage() {
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
    const { error } = await sb.auth.signUp({ email, password });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    window.location.href = "/assistindo";
  }

  return (
    <AuthShell title="Criar conta" subtitle="Comece a rastrear tudo que você assiste">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <AuthField label="E-mail">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className={inputCls}
            required
          />
        </AuthField>
        <AuthField label="Senha">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mín. 6 caracteres"
            className={inputCls}
            minLength={6}
            required
          />
        </AuthField>
        {error && <p className="text-accent text-sm">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="bg-accent text-text-primary font-semibold py-3 rounded-xl disabled:opacity-50"
        >
          {busy ? "Criando…" : "Criar conta"}
        </button>
      </form>
      <p className="text-text-secondary text-sm mt-6 text-center">
        Já tem conta?{" "}
        <Link href="/login" className="text-accent font-medium">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}