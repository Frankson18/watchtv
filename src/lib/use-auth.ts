"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import type { Session, User } from "@supabase/supabase-js";

type SupabaseClient = NonNullable<ReturnType<typeof createClient>>;

let client: SupabaseClient | null = null;
function getClient() {
  if (!client) client = createClient();
  return client;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const sb = getClient();
    if (!sb) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfigured(false);
      setLoading(false);
      return;
    }
    let mounted = true;
    let resolved = false;

    const apply = (s: Session | null) => {
      if (!mounted || resolved) return;
      resolved = true;
      setUser(s?.user ?? null);
      setSession(s);
      setLoading(false);
    };

    // Listar PRIMEIRO — fonte confiável de quem está logado
    sb.auth.getSession()
      .then(({ data }) => {
        if (data.session) apply(data.session);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    // Depois escutar mudanças em tempo real
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      apply(s);
    });

    // Fallback: se nada respondeu em 3s, libera o loading
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading, configured };
}