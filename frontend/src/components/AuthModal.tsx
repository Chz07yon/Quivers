"use client";

/**
 * Quivers Archery-Themed Authentication Modal.
 * Supports Sign In & Sign Up with email, error feedback, and loading states.
 */

import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Target,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "./AuthProvider";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
}

export function AuthModal({
  isOpen,
  onClose,
  defaultMode = "signin",
}: AuthModalProps) {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg("Please provide both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Welcome back! Successfully signed in.");
          setTimeout(() => {
            onClose();
          }, 600);
        }
      } else {
        const { error, session } = await signUp(email, password, fullName);
        if (error) {
          setErrorMsg(error.message);
        } else if (session) {
          setSuccessMsg("Account created and signed in successfully!");
          setTimeout(() => {
            onClose();
          }, 600);
        } else {
          setSuccessMsg(
            "Account created! Please check your email inbox to confirm your account."
          );
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Archery Header Banner */}
        <div className="relative border-b border-stone-200 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-6 py-5 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
                {mode === "signin" ? "Enter the Quiver Vault" : "Join Quivers"}
              </h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                {mode === "signin"
                  ? "Sign in to access your saved quivers & documents"
                  : "Create an account to forge AI quizzes and track progress"}
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="mt-4 flex rounded-lg bg-stone-100 p-1 dark:bg-zinc-800/80">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                mode === "signin"
                  ? "bg-white text-stone-950 shadow-xs dark:bg-zinc-900 dark:text-stone-50"
                  : "text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                mode === "signup"
                  ? "bg-white text-stone-950 shadow-xs dark:bg-zinc-900 dark:text-stone-50"
                  : "text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isConfigured && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <strong className="font-semibold">Notice:</strong> Supabase credentials
              have not yet been populated in <code className="font-mono">frontend/.env.local</code>.
              Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable live auth.
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300 mb-1.5">
                Full Name or Archer Tag
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Robin of Loxley"
                  className="w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-100 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="archer@quivers.dev"
                className="w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-100 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-stone-300 bg-white pl-9 pr-10 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-100 dark:placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:text-zinc-500 dark:hover:text-zinc-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === "signup" && (
              <p className="mt-1 text-[11px] text-stone-500 dark:text-zinc-500">
                Minimum 6 characters.
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-stone-950 shadow-sm hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer dark:bg-amber-400 dark:hover:bg-amber-300"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-950 border-t-transparent" />
                <span>Releasing arrow...</span>
              </div>
            ) : (
              <>
                <span>{mode === "signin" ? "Sign In to Vault" : "Create My Quiver Account"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="border-t border-stone-100 bg-stone-50 px-6 py-3 text-center text-xs text-stone-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
          <span className="flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Row Level Security guarantees your quivers remain 100% private.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
