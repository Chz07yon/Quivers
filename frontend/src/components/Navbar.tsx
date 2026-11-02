"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sun, Moon, ArrowRight, Layers, Sparkles, Activity } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { fetchBackendHealth } from "@/lib/api";

interface NavbarProps {
  onUploadClick?: () => void;
}

export function Navbar({ onUploadClick }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/80 bg-stone-50/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand: Logo + "Quivers" Wordmark */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800">
            {/* The transparent logo with CSS inversion in dark mode (no white box) */}
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
          <a
            href="#my-quiver-preview"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-stone-600 hover:text-stone-950 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <Layers className="h-4 w-4 text-amber-500" />
            <span>My Quiver</span>
            <span className="ml-1 rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              3 Saved
            </span>
          </a>

          <a
            href="#backend-health"
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
            href="#how-it-works"
            className="rounded-md px-3 py-1.5 text-stone-600 hover:text-stone-950 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            How it Works
          </a>

          <a
            href="#design-system"
            className="rounded-md px-3 py-1.5 text-stone-600 hover:text-stone-950 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            Design System & Viva
          </a>
        </nav>

        {/* Right Action Bar: Theme Toggle & Upload CTA */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 shadow-xs hover:bg-stone-100 hover:text-stone-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            className="group inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <Sparkles className="h-4 w-4 text-amber-400 dark:text-stone-950" />
            <span>Upload PDF</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </header>
  );
}
