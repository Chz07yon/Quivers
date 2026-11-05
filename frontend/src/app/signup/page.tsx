"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, isConfigured, user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already signed in, redirect
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-stone-50 dark:bg-zinc-950">
        <div className="text-center space-y-4">
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            You are currently signed in as <strong className="text-stone-900 dark:text-stone-100">{user.email}</strong>
          </p>
          <Link
            href="/quivers"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-all"
          >
            <span>Proceed to Quiver Vault</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error, session } = await signUp(email, password, fullName);
      if (error) {
        setErrorMsg(error.message);
      } else if (session) {
        setSuccessMsg("Account created and signed in! Directing to Quiver Vault...");
        setTimeout(() => {
          router.push("/quivers");
        }, 600);
      } else {
        setSuccessMsg(
          "Verification link dispatched! Please check your inbox to verify your email address before logging in."
        );
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-stone-50 text-stone-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800">
            <Image
              src="/Quivers_logo.png"
              alt="Quivers Logo"
              width={34}
              height={34}
              className="object-contain dark:invert transition-transform group-hover:scale-110"
            />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-stone-950 dark:text-white">
            Quivers
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Create your Quivers account</h2>
        <p className="mt-1.5 text-xs sm:text-sm text-stone-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
          >
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-10">
          {!isConfigured && (
            <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <strong className="font-semibold">Setup Tip:</strong> Populate{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
              <code className="font-mono">frontend/.env.local</code>.
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300 mb-1.5">
                Full Name / Learner Tag
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

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-zinc-300 mb-1.5">
                Email address
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
              <p className="mt-1 text-[11px] text-stone-500 dark:text-zinc-500">
                Minimum 6 characters.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-stone-950 shadow-sm hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer dark:bg-amber-400 dark:hover:bg-amber-300"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-950 border-t-transparent" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-stone-100 pt-4 text-center dark:border-zinc-800">
            <Link
              href="/"
              className="text-xs text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← Back to Quivers Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
