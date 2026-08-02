import { useEffect, useState } from "react";
import { createClient } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

let client: NonNullable<ReturnType<typeof createClient>> | null = null;
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

    sb.auth.getSession().then(({ data }) => {
      if (data.session) apply(data.session);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      apply(s);
    });

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