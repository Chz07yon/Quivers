"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Zap,
  ShieldCheck,
  Cpu,
  Clock,
} from "lucide-react";
import { fetchBackendHealth, BackendHealthResponse, BACKEND_URL } from "@/lib/api";

export function BackendHealthCard() {
  const [health, setHealth] = useState<BackendHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBackendHealth();
      setHealth(data);
      setLastChecked(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to connect to backend server");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div
      id="backend-health"
      className="w-full rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              health
                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                : error
                ? "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
            }`}
          >
            <Server className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Phase 1: Backend Health & CORS Bridge
              </h4>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  health
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : error
                    ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    health
                      ? "bg-emerald-500 animate-pulse"
                      : error
                      ? "bg-red-500"
                      : "bg-amber-500 animate-ping"
                  }`}
                />
                <span>
                  {loading
                    ? "Pinging FastAPI..."
                    : health
                    ? "Live & Connected"
                    : "Offline"}
                </span>
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
              Target endpoint: <code className="font-mono text-stone-700 dark:text-zinc-300">{BACKEND_URL}/health</code>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={checkHealth}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-950 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Checking..." : "Re-ping Health"}</span>
        </button>
      </div>

      {/* When Connected: Show diagnostics and viva verification metrics */}
      {health && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl bg-stone-50 p-3 dark:bg-zinc-800/50 border border-stone-100 dark:border-zinc-800">
              <span className="text-[11px] text-stone-500 dark:text-zinc-400 block">Service</span>
              <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                {health.service} v{health.version}
              </span>
            </div>

            <div className="rounded-xl bg-stone-50 p-3 dark:bg-zinc-800/50 border border-stone-100 dark:border-zinc-800">
              <span className="text-[11px] text-stone-500 dark:text-zinc-400 block">Round-Trip Latency</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                {health.latencyMs} ms
              </span>
            </div>

            <div className="rounded-xl bg-stone-50 p-3 dark:bg-zinc-800/50 border border-stone-100 dark:border-zinc-800">
              <span className="text-[11px] text-stone-500 dark:text-zinc-400 block">Environment</span>
              <span className="font-bold text-stone-900 dark:text-stone-100 text-sm capitalize">
                {health.environment}
              </span>
            </div>

            <div className="rounded-xl bg-stone-50 p-3 dark:bg-zinc-800/50 border border-stone-100 dark:border-zinc-800">
              <span className="text-[11px] text-stone-500 dark:text-zinc-400 block">CORS Bridge</span>
              <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                Allowed (200 OK)
              </span>
            </div>
          </div>

          {/* Service Configuration Matrix for Viva */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
              Backend Service Diagnostics
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-800 border border-stone-100 dark:border-zinc-700/60">
                <span className="text-stone-600 dark:text-zinc-300">Claude API Pipeline:</span>
                <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                  {health.services.claude_llm}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-800 border border-stone-100 dark:border-zinc-700/60">
                <span className="text-stone-600 dark:text-zinc-300">Supabase Postgres:</span>
                <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                  {health.services.supabase_db}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* When Offline: Show friendly troubleshooting guide */}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900/50 dark:bg-red-950/30 text-xs">
          <div className="flex items-start gap-2.5 text-red-700 dark:text-red-300">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Backend Unreachable</p>
              <p className="mt-1 text-red-600 dark:text-red-400 leading-relaxed">
                {error}
              </p>
              <div className="mt-3 rounded-lg bg-white/80 p-2.5 dark:bg-black/40 border border-red-200 dark:border-red-900/40 text-stone-800 dark:text-zinc-300">
                <p className="font-semibold text-stone-900 dark:text-white mb-1">
                  To start the FastAPI backend:
                </p>
                <code className="block font-mono text-[11px] text-amber-600 dark:text-amber-400">
                  cd backend && uvicorn main:app --reload --port 8000
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
