import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ensureUserBootstrap } from "@/lib/account.functions";
import type { AppRole } from "@/lib/pasallave";


export type AuthState = {
  loading: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  name: string | null;
  role: AppRole | null;
  kioskId: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [kioskId, setKioskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrapped = useRef<string | null>(null);

  const loadProfile = async (userId: string | null) => {
    if (!userId) {
      setRole(null);
      setName(null);
      setKioskId(null);
      return;
    }
    if (bootstrapped.current !== userId) {
      bootstrapped.current = userId;
      try {
        await ensureUserBootstrap();
      } catch {
        // si falla la reparación seguimos con los datos existentes
      }
    }
    const [{ data: roleRow }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle(),
      supabase.from("profiles").select("name, kiosk_id").eq("id", userId).maybeSingle(),
    ]);
    setRole((roleRow?.role as AppRole | undefined) ?? null);
    setName(profile?.name ?? null);
    setKioskId(profile?.kiosk_id ?? null);
  };


  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      void loadProfile(nextSession?.user.id ?? null);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      name,
      role,
      kioskId,
      refresh: async () => {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        await loadProfile(data.session?.user.id ?? null);
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
        setRole(null);
        setName(null);
        setKioskId(null);
        bootstrapped.current = null;
        navigate({ to: "/" });
      },
    }),
    [loading, session, role, name, kioskId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
