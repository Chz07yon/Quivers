"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sun,
  Moon,
  ArrowRight,
  Layers,
  Sparkles,
  Activity,
  LogIn,
  LogOut,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";
import { AuthModal } from "./AuthModal";
import { fetchBackendHealth } from "@/lib/api";

interface NavbarProps {
  onUploadClick?: () => void;
}

export function Navbar({ onUploadClick }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"signin" | "signup">("signin");
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    fetchBackendHealth(2500)
      .then((data) => {
        setBackendStatus("online");
        if (data.latencyMs) setLatency(data.latencyMs);
      })
      .catch(() => {
        setBackendStatus("offline");
      });
  }, []);

  const openAuth = (mode: "signin" | "signup") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/80 bg-stone-50/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand: Logo + "Quivers" Wordmark */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800">
            <Image
              src="/Quivers_logo.png"
              alt="Quivers Logo"
              width={34}
              height={34}
              priority
              className="object-contain transition-transform duration-300 group-hover:scale-110 dark:invert"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
              Quivers
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-600 dark:text-amber-400 -mt-1">
              AI Knowledge Quiver
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/quivers"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-stone-600 hover:text-stone-950 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <Layers className="h-4 w-4 text-amber-500" />
            <span>My Quiver</span>
            {user ? (
              <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                Vault
              </span>
            ) : (
              <span className="ml-1 rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Preview
              </span>
            )}
          </Link>

          <a
            href="/#backend-health"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-stone-600 hover:text-stone-950 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <Activity className="h-4 w-4 text-emerald-500" />
            <span>Backend Health</span>
            <span
              className={`ml-1 flex h-2 w-2 rounded-full ${
                backendStatus === "online"
                  ? "bg-emerald-500 animate-pulse"
                  : backendStatus === "checking"
                  ? "bg-amber-400"
                  : "bg-red-400"
              }`}
            />
          </a>

          <a
            href="/#auth-verification"
            className="rounded-md px-3 py-1.5 text-stone-600 hover:text-stone-950 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            Auth & RLS Verification
          </a>

          <a
            href="/#how-it-works"
            className="rounded-md px-3 py-1.5 text-stone-600 hover:text-stone-950 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            How it Works
          </a>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* User Status / Auth Controls */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/quivers"
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                title={user.email || "My Vault"}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  {user.email ? user.email[0].toUpperCase() : "U"}
                </div>
                <span className="max-w-[120px] truncate">{user.email}</span>
              </Link>

              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-2 text-stone-600 hover:bg-red-50 hover:text-red-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openAuth("signin")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition-all cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5 text-amber-500" />
                <span>Log In</span>
              </button>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 shadow-xs hover:bg-stone-100 hover:text-stone-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0" />
            ) : (
              <Moon className="h-4 w-4 text-stone-700 transition-transform rotate-0" />
            )}
          </button>

          {/* Upload Call-To-Action Button */}
          <button
            type="button"
            onClick={onUploadClick}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-amber-400 dark:text-stone-950" />
            <span className="hidden sm:inline">Upload PDF</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
    </header>
  );
}
