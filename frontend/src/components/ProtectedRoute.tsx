"use client";

/**
 * Quivers Protected Route Wrapper.
 * Prevents unauthorized access by checking the authenticated user session.
 * Displays a styled archery vault gatekeeper when access is unauthenticated.
 */

import React, { useState } from "react";
import { ShieldAlert, Target, LogIn, ArrowRight } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { AuthModal } from "./AuthModal";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function ProtectedRoute({
  children,
  fallbackTitle = "Archer Authentication Required",
  fallbackMessage = "You must be signed in with a verified Supabase account to access this quiver vault.",
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Target className="h-6 w-6 animate-spin" />
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-stone-600 dark:text-zinc-400">
          Nocking arrow and verifying learner credentials...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto my-12 max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 border border-amber-500/20 mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h3 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          {fallbackTitle}
        </h3>
        <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400 leading-relaxed">
          {fallbackMessage}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-stone-950 shadow-sm hover:bg-amber-400 transition-all cursor-pointer dark:bg-amber-400 dark:hover:bg-amber-300"
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In to Unlock</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-100 dark:border-zinc-800 text-[11px] text-stone-500 dark:text-zinc-500">
          Enforced by PostgreSQL Row Level Security (RLS) & FastAPI Bearer verification.
        </div>

        <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    );
  }

  return <>{children}</>;
}

