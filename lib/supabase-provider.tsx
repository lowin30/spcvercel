"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation";
import { type SupabaseClient, type User, type AuthChangeEvent, type Session } from "@supabase/supabase-js";
import { createSsrClient } from "./ssr-client"; // Usar el nuevo cliente SSR

type SupabaseContext = {
  supabase: SupabaseClient<any, "public", any>; // Corregidas las comillas
  user: User | null;
  loading: boolean;
};

const Context = createContext<SupabaseContext | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [supabase] = useState(() => createSsrClient());

  useEffect(() => {
    const getInitialUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
      // Opcional: Considerar router.refresh() para otros eventos si es necesario para Server Components
      // if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      //   router.refresh();
      // }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase, router]);

  return <Context.Provider value={{ supabase, user, loading }}>{children}</Context.Provider>
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider")
  }
  return context
}
