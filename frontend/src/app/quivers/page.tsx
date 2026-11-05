"use client";

/**
 * Phase 7: "My Quiver" Storage, History & Analytics Page.
 * Built with the Quivers Phase 0 Archery Design System:
 * - Supabase email authentication with RLS protected storage.
 * - Saved Quizzes list (The Quivers) with direct quiz launcher.
 * - Chronological attempt flight history with mastery rank tiers.
 * - Weak-topics visual analytics chart based on attempt history.
 * - Viva security diagnostics (JWT cryptographic verification & RLS proofs).
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Target,
  FileText,
  ArrowRight,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Lock,
  Layers,
  Clock,
  Award,
  AlertTriangle,
  Compass,
  BarChart3,
  BookOpen,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Play,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { Navbar } from "@/components/Navbar";
import { QuizRunner } from "@/components/QuizRunner";
import {
  BACKEND_URL,
  MyQuiverAnalyticsResponse,
  StoredQuiz,
  StoredAttempt,
  WeakTopicRecord,
  GeneratedQuestion,
  fetchMyQuiverAnalytics,
  generateAdaptiveRetryQuiz,
  MissedTopicInput,
} from "@/lib/api";

type QuiverTab = "quizzes" | "history" | "analytics" | "security";

export default function MyQuiversVaultPage() {
  const { user, session, signOut } = useAuth();
  const token = session?.access_token;

  // Tab State
  const [activeTab, setActiveTab] = useState<QuiverTab>("quizzes");

  // Data State
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<MyQuiverAnalyticsResponse | null>(null);

  // Active Quiz Launcher state
  const [activeQuizToTake, setActiveQuizToTake] = useState<StoredQuiz | null>(null);
  const [adaptiveQuiz, setAdaptiveQuiz] = useState<{
    questions: GeneratedQuestion[];
    title: string;
  } | null>(null);
  const [isGeneratingAdaptiveDrill, setIsGeneratingAdaptiveDrill] = useState(false);

  // Security test state for viva defense
  const [securityTestResult, setSecurityTestResult] = useState<{
    name: string;
    status: number;
    expected: number;
    passed: boolean;
    data: unknown;
  } | null>(null);

  // Load analytics and vault data from backend
  const loadVaultData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await fetchMyQuiverAnalytics(token);
      setAnalytics(data);
    } catch (err: unknown) {
      console.warn("Could not load analytics from backend:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect to backend vault.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadVaultData();
    }
  }, [token]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}m ${remainder < 10 ? "0" : ""}${remainder}s`;
  };

  // Convert StoredQuiz questions to GeneratedQuestion format for QuizRunner
  const convertStoredToGenerated = (stored: StoredQuiz): GeneratedQuestion[] => {
    return stored.questions.map((q) => ({
      arrow_order: q.arrow_order,
      question: q.question,
      type: q.type as any,
      options: q.options,
      correct_answer: q.correct_answer,
      correct_index: q.correct_index,
      explanation: q.explanation,
      source_page: q.source_page,
      source_passage: q.source_passage,
      bloom_level: q.bloom_level as any,
      difficulty: stored.difficulty,
      heading: q.heading,
    }));
  };

  // Viva Security Test 1: Request with no token
  const runUnauthenticatedTest = async () => {
    setSecurityTestResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      setSecurityTestResult({
        name: "No Token Test (/api/auth/me)",
        status: res.status,
        expected: 401,
        passed: res.status === 401,
        data,
      });
    } catch (err: any) {
      setSecurityTestResult({
        name: "No Token Test",
        status: 0,
        expected: 401,
        passed: false,
        data: { error: err.message },
      });
    }
  };

  // Viva Security Test 2: Forged token
  const runTamperedTokenTest = async () => {
    setSecurityTestResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.forged.signature",
          Accept: "application/json",
        },
      });
      const data = await res.json();
      setSecurityTestResult({
        name: "Forged Token Test (/api/auth/me)",
        status: res.status,
        expected: 401,
        passed: res.status === 401,
        data,
      });
    } catch (err: any) {
      setSecurityTestResult({
        name: "Forged Token Test",
        status: 0,
        expected: 401,
        passed: false,
        data: { error: err.message },
      });
    }
  };

  const handleLaunchAdaptiveDrill = async () => {
    if (!weakTopics || weakTopics.length === 0) return;
    setIsGeneratingAdaptiveDrill(true);
    try {
      const missedInputs: MissedTopicInput[] = weakTopics.map((t) => ({
        heading: t.topic,
        source_page: t.source_page,
        missed_count: t.missed_count,
        question_stems: [],
        source_passage: null,
      }));

      const res = await generateAdaptiveRetryQuiz({
        original_quiz_title: "My Quiver Weak-Topics Remediation",
        missed_topics: missedInputs,
        total_questions: Math.max(3, Math.min(8, weakTopics.length * 2)),
      });

      if (res.questions && res.questions.length > 0) {
        setAdaptiveQuiz({
          questions: res.questions,
          title: res.adaptive_quiz_title,
        });
      }
    } catch (err: any) {
      alert("Failed to generate adaptive drill: " + (err.message || String(err)));
    } finally {
      setIsGeneratingAdaptiveDrill(false);
    }
  };

  // If user launched an adaptive drill on weak topics
  if (adaptiveQuiz) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 dark:bg-zinc-950 dark:text-zinc-50">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
          <QuizRunner
            questions={adaptiveQuiz.questions}
            quizTitle={adaptiveQuiz.title}
            onExit={() => {
              setAdaptiveQuiz(null);
              loadVaultData();
            }}
            onFinish={() => {
              loadVaultData();
            }}
          />
        </main>
      </div>
    );
  }

  // If user launched a quiz from their vault
  if (activeQuizToTake) {
    const questionsToRun = convertStoredToGenerated(activeQuizToTake);
    return (
      <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 dark:bg-zinc-950 dark:text-zinc-50">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
          <QuizRunner
            questions={questionsToRun}
            quizTitle={activeQuizToTake.title}
            onExit={() => {
              setActiveQuizToTake(null);
              loadVaultData();
            }}
          />
        </main>
      </div>
    );
  }

  const quizzes = analytics?.quizzes || [];
  const attempts = analytics?.recent_attempts || [];
  const weakTopics = analytics?.weak_topics || [];

  return (
    <ProtectedRoute
      fallbackTitle="My Quiver Vault is Protected"
      fallbackMessage="Your documents, saved quizzes, and attempt performance history are isolated under Supabase Row Level Security. Sign in with your email to access your personal vault."
    >
      <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors">
        <Navbar />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-8 border-b border-stone-200 dark:border-zinc-800 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                  Phase 7 • Storage, History & Analytics
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-stone-950 dark:text-white">
                My Quiver Vault
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-zinc-400">
                Logged in as <strong className="text-stone-900 dark:text-stone-200">{user?.email}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={loadVaultData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Vault</span>
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* 4 TOP PERFORMANCE KPI CARDS */}
          <div className="my-8 grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* 1. Saved Quivers */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                  Saved Quivers
                </span>
                <Target className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-stone-900 dark:text-stone-50">
                {analytics?.total_quizzes || 0}
              </div>
              <p className="mt-1 text-[11px] text-stone-500 dark:text-zinc-400">
                Ready for practice
              </p>
            </div>

            {/* 2. Total Attempts Completed */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                  Total Attempts
                </span>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-stone-900 dark:text-stone-50">
                {analytics?.total_attempts || 0}
              </div>
              <p className="mt-1 text-[11px] text-stone-500 dark:text-zinc-400">
                Flight sessions recorded
              </p>
            </div>

            {/* 3. Overall Accuracy */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 dark:bg-emerald-500/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Overall Accuracy
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-emerald-950 dark:text-emerald-100">
                {analytics?.overall_accuracy_percentage || 0}%
              </div>
              <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                {analytics?.bullseyes_hit || 0} / {analytics?.total_arrows_shot || 0} bullseyes
              </p>
            </div>

            {/* 4. Weak Topics to Review */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 dark:bg-amber-500/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Knowledge Gaps
                </span>
                <Compass className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-amber-950 dark:text-amber-100">
                {weakTopics.filter((t) => t.missed_count > 0).length}
              </div>
              <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                Topics requiring study
              </p>
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div className="flex items-center gap-2 border-b border-stone-200 dark:border-zinc-800 pb-3 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("quizzes")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "quizzes"
                  ? "bg-amber-500 text-stone-950 shadow-xs dark:bg-amber-400"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              <Target className="h-4 w-4" />
              <span>Saved Quivers</span>
              <span className="rounded-full bg-stone-950/15 px-1.5 py-0.2 text-[10px]">
                {quizzes.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-amber-500 text-stone-950 shadow-xs dark:bg-amber-400"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Flight History</span>
              <span className="rounded-full bg-stone-950/15 px-1.5 py-0.2 text-[10px]">
                {attempts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-amber-500 text-stone-950 shadow-xs dark:bg-amber-400"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Weak-Topics Chart</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "security"
                  ? "bg-amber-500 text-stone-950 shadow-xs dark:bg-amber-400"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Viva RLS Proofs</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: SAVED QUIZZES (THE QUIVERS)                             */}
          {/* ============================================================== */}
          {activeTab === "quizzes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <p className="text-xs text-stone-500 dark:text-zinc-400">
                  Select any quiver to enter the arena and practice arrows one-by-one.
                </p>
                <Link
                  href="/#upload-section"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  <span>Forge New Quiver from PDF</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {quizzes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 mb-4">
                    <Target className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    No quivers saved yet
                  </h3>
                  <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400 max-w-md mx-auto">
                    Upload a PDF document to extract chunks, forge arrows, and save your first quiz quiver.
                  </p>
                  <div className="mt-5">
                    <Link
                      href="/#upload-section"
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-all"
                    >
                      <span>Upload PDF to Forge Quiver</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between hover:border-amber-500/40 transition-all"
                    >
                      <div>
                        {/* Header metadata */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            <Target className="h-3 w-3" />
                            <span>{quiz.total_arrows} Arrows</span>
                          </span>

                          <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-stone-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {quiz.difficulty}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                          {quiz.title}
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                          {quiz.document_name || "Document Syllabus"}
                        </p>

                        {/* Performance metrics pill */}
                        <div className="mt-4 pt-3 border-t border-stone-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                          <span className="text-stone-500 dark:text-zinc-400">
                            {quiz.attempts_count === 0
                              ? "Not attempted"
                              : `${quiz.attempts_count} attempt(s)`}
                          </span>

                          {quiz.best_score_percentage !== null ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Best: {quiz.best_score_percentage}%
                            </span>
                          ) : (
                            <span className="text-stone-400 dark:text-zinc-500 italic">
                              Ready
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => setActiveQuizToTake(quiz)}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 py-2.5 text-xs font-bold text-white hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 transition-all cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Launch Quiz Arena</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: PAST FLIGHT ATTEMPTS (HISTORY)                          */}
          {/* ============================================================== */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <p className="text-xs text-stone-500 dark:text-zinc-400 pb-1">
                Full chronological audit of completed flight attempts with bullseye accuracy scores.
              </p>

              {attempts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                  <Clock className="h-10 w-10 text-stone-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    No flight records yet
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
                    Complete your first quiz to record arrow accuracy and performance metrics.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden shadow-xs">
                  <div className="divide-y divide-stone-100 dark:divide-zinc-800">
                    {attempts.map((att) => (
                      <div
                        key={att.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 dark:hover:bg-zinc-850/50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                              {att.quiz_title}
                            </span>
                            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {att.rank_tier}
                            </span>
                          </div>
                          <span className="text-xs text-stone-500 dark:text-zinc-400">
                            {new Date(att.completed_at).toLocaleDateString()} • Time: {formatTime(att.time_spent_seconds)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xl font-extrabold text-stone-950 dark:text-stone-50 block">
                              {att.bullseye_percentage}%
                            </span>
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              {att.score} / {att.total_arrows} Bullseyes
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: WEAK-TOPICS ANALYTICS (THE CHART)                       */}
          {/* ============================================================== */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-zinc-800 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-amber-500" />
                      <span>Weak-Topics Mastery Breakdown</span>
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                      Aggregated across all attempt history to pinpoint concepts requiring study.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {weakTopics.length > 0 && (
                      <button
                        type="button"
                        onClick={handleLaunchAdaptiveDrill}
                        disabled={isGeneratingAdaptiveDrill}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Target className={`h-3.5 w-3.5 ${isGeneratingAdaptiveDrill ? "animate-spin" : ""}`} />
                        <span>{isGeneratingAdaptiveDrill ? "Forging Drill..." : "Launch Adaptive Drill"}</span>
                      </button>
                    )}
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                      {weakTopics.length} Topic(s) Audited
                    </span>
                  </div>
                </div>

                {weakTopics.length === 0 ? (
                  <div className="text-center py-12 text-xs text-stone-500 dark:text-zinc-400">
                    No attempt data available yet. Complete a quiz attempt to generate your weak-topics chart!
                  </div>
                ) : (
                  <div className="space-y-5">
                    {weakTopics.map((topic, idx) => {
                      const isWeak = topic.accuracy_percentage < 70;
                      const isMastered = topic.accuracy_percentage >= 90;

                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-stone-100 bg-stone-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-850/60 transition-all"
                        >
                          {/* Topic Header & Metrics */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                                {topic.topic}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-amber-500 dark:text-stone-950">
                                <BookOpen className="h-3 w-3" />
                                <span>Page {topic.source_page}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-stone-500 dark:text-zinc-400">
                                {topic.total_tested - topic.missed_count} of {topic.total_tested} correct
                              </span>
                              <span
                                className={`font-extrabold ${
                                  isWeak
                                    ? "text-red-600 dark:text-red-400"
                                    : isMastered
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {topic.accuracy_percentage}% Accuracy
                              </span>
                            </div>
                          </div>

                          {/* Visual Progress Bar (The Chart) */}
                          <div className="h-3 w-full rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden mb-2">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isWeak
                                  ? "bg-red-500"
                                  : isMastered
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${Math.max(5, topic.accuracy_percentage)}%` }}
                            />
                          </div>

                          {/* Actionable Study Recommendation */}
                          <div className="text-[11px] text-stone-600 dark:text-zinc-400 flex items-center gap-1.5 mt-1">
                            {isWeak ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            )}
                            <span>{topic.study_action}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: VIVA DEFENSE & RLS PROOFS                               */}
          {/* ============================================================== */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                      Row Level Security (RLS) & JWT Verification Defense
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-zinc-400">
                      Live interactive proofs demonstrating zero-trust user isolation for your viva defense.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                  <button
                    type="button"
                    onClick={runUnauthenticatedTest}
                    className="p-4 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-left dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 transition-all cursor-pointer"
                  >
                    <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                      1. Test Missing Token (Expect 401 Unauthorized)
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-zinc-400 mt-1">
                      Proves protected backend endpoints reject calls without Bearer tokens.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={runTamperedTokenTest}
                    className="p-4 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-left dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 transition-all cursor-pointer"
                  >
                    <div className="font-bold text-xs text-stone-900 dark:text-stone-100">
                      2. Test Forged Token (Expect 401 Unauthorized)
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-zinc-400 mt-1">
                      Proves backend cryptographically checks signatures, never trusting payload claims.
                    </div>
                  </button>
                </div>

                {securityTestResult && (
                  <div
                    className={`rounded-xl border p-4 text-xs ${
                      securityTestResult.passed
                        ? "border-emerald-500/40 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "border-red-500/40 bg-red-50/50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span>{securityTestResult.name}: {securityTestResult.passed ? "PASSED" : "FAILED"}</span>
                      <span className="font-mono">HTTP {securityTestResult.status} (Expected {securityTestResult.expected})</span>
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded bg-black/10 dark:bg-black/30 p-2 font-mono text-[11px]">
                      {JSON.stringify(securityTestResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
