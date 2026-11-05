"use client";

/**
 * Quivers Supabase Authentication Context & Provider.
 * Provides reactive session state, sign up, log in, log out, and JWT token access.
 * Styled for seamless integration with the Quivers archery theme.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  accessToken: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: AuthError | null; session: Session | null; user: User | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const isConfig = isSupabaseConfigured();
    setConfigured(isConfig);

    if (!isConfig) {
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    // 1. Initial Session Load
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!error && session) {
          setSession(session);
          setUser(session.user);
        } else {
          setSession(null);
          setUser(null);
        }
      })
      .catch((err) => {
        console.warn("Failed to retrieve Supabase session:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // 2. Real-time Auth State Change Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName?.trim() || "",
        },
      },
    });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
    }
    return { error, session: data.session, user: data.user };
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const refreshSession = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.refreshSession();
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
    }
  };

  const accessToken = session?.access_token ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        accessToken,
        isLoading,
        isConfigured: configured,
        signIn,
        signUp,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

