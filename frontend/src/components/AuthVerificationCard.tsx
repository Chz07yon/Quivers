"use client";

/**
 * Quivers Supabase Auth & Row Level Security (RLS) Verification Card.
 * Allows the examiner or developer to verify in real-time:
 * 1. User sign up & log in status
 * 2. FastAPI JWT verification on protected endpoints (/api/auth/me)
 * 3. Rejection of unauthenticated requests (HTTP 401)
 * 4. Cryptographic protection against token tampering
 * 5. Multi-tenant database isolation instructions for viva defense
 */

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  UserCheck,
  LogIn,
  CheckCircle2,
  XCircle,
  Play,
  Database,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { AuthModal } from "./AuthModal";
import { BACKEND_URL } from "@/lib/api";

interface TestResponseState {
  endpoint: string;
  status: number;
  expectedStatus: number;
  passed: boolean;
  explanation: string;
  payload: unknown;
  loading: boolean;
}

export function AuthVerificationCard() {
  const { user, session, isConfigured } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTest, setActiveTest] = useState<TestResponseState | null>(null);

  const token = session?.access_token;

  // 1. Test Authenticated Request (Expect 200)
  const testAuthenticatedCall = async () => {
    if (!token) {
      setActiveTest({
        endpoint: "/api/auth/me",
        status: 0,
        expectedStatus: 200,
        passed: false,
        explanation: "Please log in first using the 'Sign In' button above to generate a valid Supabase JWT.",
        payload: { error: "No active session" },
        loading: false,
      });
      return;
    }

    setActiveTest({
      endpoint: "/api/auth/me (With Valid JWT)",
      status: 0,
      expectedStatus: 200,
      passed: false,
      explanation: "Verifying JWT token with FastAPI backend...",
      payload: null,
      loading: true,
    });

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      setActiveTest({
        endpoint: "/api/auth/me (With Valid JWT)",
        status: res.status,
        expectedStatus: 200,
        passed: res.status === 200,
        explanation:
          res.status === 200
            ? "FastAPI cryptographically validated the Supabase JWT. Notice user_id is derived strictly from token payload, never from request body."
            : `Backend returned unexpected status HTTP ${res.status}.`,
        payload: data,
        loading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setActiveTest({
        endpoint: "/api/auth/me (With Valid JWT)",
        status: 0,
        expectedStatus: 200,
        passed: false,
        explanation: `Connection failed: ${msg}. Ensure backend is running.`,
        payload: { error: msg },
        loading: false,
      });
    }
  };

  // 2. Test Unauthenticated Request (Expect 401)
  const testUnauthenticatedCall = async () => {
    setActiveTest({
      endpoint: "/api/auth/me (No Bearer Token)",
      status: 0,
      expectedStatus: 401,
      passed: false,
      explanation: "Dispatching request with no Authorization header...",
      payload: null,
      loading: true,
    });

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          Accept: "application/json",
          // Intentionally omitting Authorization
        },
      });
      const data = await res.json();
      setActiveTest({
        endpoint: "/api/auth/me (No Bearer Token)",
        status: res.status,
        expectedStatus: 401,
        passed: res.status === 401,
        explanation:
          res.status === 401
            ? "Rejection verified! FastAPI HTTPBearer rejected the unauthenticated request with HTTP 401 Unauthorized."
            : `Expected HTTP 401, but received HTTP ${res.status}.`,
        payload: data,
        loading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setActiveTest({
        endpoint: "/api/auth/me (No Bearer Token)",
        status: 0,
        expectedStatus: 401,
        passed: false,
        explanation: `Connection failed: ${msg}`,
        payload: { error: msg },
        loading: false,
      });
    }
  };

  // 3. Test Forged Token (Expect 401)
  const testForgedTokenCall = async () => {
    setActiveTest({
      endpoint: "/api/auth/me (Forged Signature)",
      status: 0,
      expectedStatus: 401,
      passed: false,
      explanation: "Dispatching request with forged/tampered token...",
      payload: null,
      loading: true,
    });

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.tampered_signature_xyz",
          Accept: "application/json",
        },
      });
      const data = await res.json();
      setActiveTest({
        endpoint: "/api/auth/me (Forged Signature)",
        status: res.status,
        expectedStatus: 401,
        passed: res.status === 401,
        explanation:
          res.status === 401
            ? "Tampered signature rejected! FastAPI verified signature against Supabase and blocked the request."
            : `Expected HTTP 401, but received HTTP ${res.status}.`,
        payload: data,
        loading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setActiveTest({
        endpoint: "/api/auth/me (Forged Signature)",
        status: 0,
        expectedStatus: 401,
        passed: false,
        explanation: `Connection failed: ${msg}`,
        payload: { error: msg },
        loading: false,
      });
    }
  };

  return (
    <div id="auth-verification" className="rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-colors">
      {/* Header Banner */}
      <div className="border-b border-stone-200 bg-stone-50/70 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 border border-amber-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
                  Supabase Auth & RLS Verification
                </h3>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Phase 1B
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Live verification panel for user authentication, protected routes, and Row Level Security isolation.
              </p>
            </div>
          </div>

          {/* Current Auth Badge */}
          <div>
            {user ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/70 px-3.5 py-1.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div className="text-left text-xs">
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold block truncate max-w-[160px]">
                    {user.email}
                  </span>
                  <span className="text-[10px] font-mono text-stone-500 dark:text-zinc-400 block truncate max-w-[160px]">
                    ID: {user.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-stone-950 hover:bg-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300 transition-all cursor-pointer shadow-xs"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In / Create Account</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {/* Action 1 */}
          <button
            type="button"
            onClick={testAuthenticatedCall}
            className="flex flex-col text-left p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-950/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                1. Test Authenticated
              </span>
              <Play className="h-3.5 w-3.5 text-stone-400 group-hover:text-emerald-500" />
            </div>
            <p className="text-[11px] text-stone-500 dark:text-zinc-400 leading-relaxed">
              Sends your Supabase JWT to <code className="font-mono">/api/auth/me</code>. Expects HTTP 200 + user ID.
            </p>
          </button>

          {/* Action 2 */}
          <button
            type="button"
            onClick={testUnauthenticatedCall}
            className="flex flex-col text-left p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:border-red-500/50 hover:bg-red-50/30 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:border-red-500/40 dark:hover:bg-red-950/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 group-hover:text-red-600 dark:group-hover:text-red-400">
                2. Test No Token
              </span>
              <Play className="h-3.5 w-3.5 text-stone-400 group-hover:text-red-500" />
            </div>
            <p className="text-[11px] text-stone-500 dark:text-zinc-400 leading-relaxed">
              Omits Bearer header to <code className="font-mono">/api/auth/me</code>. Proves FastAPI rejects unauthenticated requests with HTTP 401.
            </p>
          </button>

          {/* Action 3 */}
          <button
            type="button"
            onClick={testForgedTokenCall}
            className="flex flex-col text-left p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:border-red-500/50 hover:bg-red-50/30 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:border-red-500/40 dark:hover:bg-red-950/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 group-hover:text-red-600 dark:group-hover:text-red-400">
                3. Test Forged Token
              </span>
              <Play className="h-3.5 w-3.5 text-stone-400 group-hover:text-red-500" />
            </div>
            <p className="text-[11px] text-stone-500 dark:text-zinc-400 leading-relaxed">
              Sends an invalid cryptographic signature. Proves FastAPI rejects forged claims with HTTP 401.
            </p>
          </button>
        </div>

        {/* Live Test Results Display */}
        {activeTest && (
          <div
            className={`rounded-xl border p-4 text-xs mb-6 ${
              activeTest.passed
                ? "border-emerald-500/40 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-red-500/40 bg-red-50/60 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            }`}
          >
            <div className="flex items-center justify-between font-semibold mb-2">
              <div className="flex items-center gap-2">
                {activeTest.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <span>{activeTest.endpoint}</span>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/10 dark:bg-black/30">
                HTTP {activeTest.status} (Expected {activeTest.expectedStatus})
              </span>
            </div>

            <p className="mb-2.5 text-stone-700 dark:text-zinc-300">
              {activeTest.explanation}
            </p>

            {activeTest.payload != null && (
              <pre className="overflow-x-auto rounded-lg bg-black/10 dark:bg-black/40 p-3 font-mono text-[11px] text-stone-900 dark:text-stone-100">
                {JSON.stringify(activeTest.payload, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Viva Defense Multi-Tenant Isolation Guide */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-stone-100 mb-2">
            <Database className="h-4 w-4 text-amber-500" />
            <span>How to Demonstrate Row Level Security in your Viva:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-stone-600 dark:text-zinc-400 leading-relaxed">
            <li>
              <strong>Register User 1:</strong> Sign up with <code className="font-mono text-stone-800 dark:text-stone-200">user1@test.com</code> and upload a PDF document.
            </li>
            <li>
              <strong>Register User 2:</strong> Open an incognito browser window, sign up with <code className="font-mono text-stone-800 dark:text-stone-200">user2@test.com</code>.
            </li>
            <li>
              <strong>Verify Zero Leakage:</strong> Visit <Link href="/quivers" className="text-amber-600 dark:text-amber-400 hover:underline font-semibold">/quivers</Link> as User 2. Notice that User 1&apos;s uploaded documents and quizzes do not appear.
            </li>
            <li>
              <strong>Database Proof:</strong> In the Supabase Table Editor, you will see both rows in the <code className="font-mono">documents</code> table, but PostgreSQL RLS strictly filters <code className="font-mono text-amber-600 dark:text-amber-400">auth.uid() = user_id</code> on every client query.
            </li>
          </ol>
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
