"use client";

/**
 * Question Generator & Arrow Viewer Component (Phase 4 & Phase 5).
 * Phase 4: Select question count, difficulty mix, and question types.
 * Phase 5: Complete Validation Layer display alongside generated quiz:
 *   - Schema validation with 1-shot retry on malformed outputs
 *   - Continuous embedding cosine similarity near-duplicate detection
 *   - 2nd-pass LLM fact-checking ("Is the correct answer supported by this source passage?")
 *   - Comprehensive audit logging of generated vs accepted vs rejected questions.
 */

import React, { useState } from "react";
import {
  Sparkles,
  Target,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  Sliders,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertCircle,
  Copy,
  Check,
  Brain,
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
  Filter,
  Code2,
  AlertTriangle,
  Scale,
  Activity,
} from "lucide-react";
import {
  TextChunk,
  GeneratedQuestion,
  QuestionGenerationConfig,
  QuestionType,
  DifficultyLevel,
  ValidationReport,
  generateQuestionsFromChunks,
  saveQuizToVault,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { QuizRunner } from "./QuizRunner";

interface QuestionGeneratorPanelProps {
  chunks: TextChunk[];
  documentName?: string;
}

export function QuestionGeneratorPanel({
  chunks,
  documentName,
}: QuestionGeneratorPanelProps) {
  // Configuration State
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    "mcq",
    "true_false",
    "fill_in_the_blank",
  ]);

  // View & Tab State
  const [activeTab, setActiveTab] = useState<"quiz" | "validation">("quiz");
  const [showRawValidationJson, setShowRawValidationJson] = useState(false);
  const [isTakingQuiz, setIsTakingQuiz] = useState(false);

  // Auth & Storage State (Phase 7)
  const { session } = useAuth();
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleType = (type: QuestionType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length === 1) return; // Keep at least one type selected
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const toggleReveal = (arrowOrder: number) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [arrowOrder]: !prev[arrowOrder],
    }));
  };

  const copyQuestion = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = async () => {
    if (!chunks || chunks.length === 0) {
      setErrorMsg("No extracted chunks available. Please extract a PDF first.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    const config: QuestionGenerationConfig = {
      total_questions: totalQuestions,
      difficulty,
      question_types: selectedTypes,
      similarity_threshold: 0.75,
    };

    try {
      const response = await generateQuestionsFromChunks(chunks, config);
      if (response.success && response.questions) {
        setGeneratedQuestions(response.questions);
        setModelUsed(response.model_used);
        setValidationReport(response.validation_report || null);
        // By default reveal all answers in inspect mode
        const initialReveals: Record<number, boolean> = {};
        response.questions.forEach((q) => {
          initialReveals[q.arrow_order] = true;
        });
        setRevealedAnswers(initialReveals);
      } else {
        setErrorMsg(response.message || "Question generation failed.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to question generator.";
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToVault = async () => {
    if (!session?.access_token) {
      setErrorMsg("Please sign in with your email account to save this quiz to your Quiver Vault.");
      return;
    }
    if (generatedQuestions.length === 0) return;

    setIsSavingQuiz(true);
    setSaveSuccessMsg(null);
    try {
      const stored = await saveQuizToVault(session.access_token, {
        document_name: documentName || "Uploaded PDF",
        title: documentName ? `${documentName} Quiz` : "Document Quiver",
        difficulty,
        questions: generatedQuestions,
      });
      setSavedQuizId(stored.id);
      setSaveSuccessMsg("Quiz successfully saved to your Quiver Vault! You can review or retake it anytime under My Quiver.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save quiz to vault.");
    } finally {
      setIsSavingQuiz(false);
    }
  };

  // Group Bloom levels for summary analytics
  const bloomCounts = generatedQuestions.reduce(
    (acc, q) => {
      acc[q.bloom_level] = (acc[q.bloom_level] || 0) + 1;
      return acc;
    },
    { recall: 0, understanding: 0, application: 0 } as Record<string, number>
  );

  if (isTakingQuiz && generatedQuestions.length > 0) {
    return (
      <div className="mt-8">
        <QuizRunner
          questions={generatedQuestions}
          quizTitle={documentName ? `Quiz: ${documentName}` : "Document Quiver"}
          quizId={savedQuizId || undefined}
          contextChunks={chunks}
          onExit={() => setIsTakingQuiz(false)}
        />
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-900 transition-all">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-stone-100 dark:border-zinc-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2">
              <h3 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
                Phase 4, 5, 6 & 7: Question Forge, Arena & Vault
              </h3>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/20">
                The Full Pipeline
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              Formulates questions strictly grounded in your {chunks.length} chunks, validated with 2nd-pass fact-checking & embedding deduplication.
            </p>
          </div>
        </div>

        {generatedQuestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTakingQuiz(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 shadow-sm transition-all cursor-pointer dark:bg-amber-400 dark:hover:bg-amber-300"
            >
              <Target className="h-3.5 w-3.5" />
              <span>Enter Quiz Arena</span>
            </button>

            {session?.access_token && (
              <button
                type="button"
                onClick={handleSaveToVault}
                disabled={isSavingQuiz || !!savedQuizId}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  savedQuizId
                    ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                }`}
              >
                {savedQuizId ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Saved to Vault</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                    <span>{isSavingQuiz ? "Saving..." : "Save to My Quiver"}</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all cursor-pointer"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              <span>Regenerate & Validate</span>
            </button>
          </div>
        )}
      </div>

      {saveSuccessMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* USER CONFIGURATION CONTROLS */}
      <div className="py-5 grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-stone-100 dark:border-zinc-800 text-xs">
        {/* 1. Number of Questions */}
        <div className="space-y-2">
          <label className="font-bold text-stone-900 dark:text-stone-100 block flex items-center justify-between">
            <span>Arrow Count (Questions)</span>
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">{totalQuestions}</span>
          </label>
          <div className="flex items-center gap-2">
            {[3, 5, 8, 10, 15].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setTotalQuestions(num)}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  totalQuestions === num
                    ? "bg-amber-500 text-stone-950 shadow-xs dark:bg-amber-400 font-bold"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-zinc-500">
            Distributed proportionally across {chunks.length} source chunk(s).
          </p>
        </div>

        {/* 2. Difficulty Mix */}
        <div className="space-y-2">
          <label className="font-bold text-stone-900 dark:text-stone-100 block">
            Target Difficulty Mix
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "easy", label: "Easy", desc: "Recall heavy" },
              { id: "medium", label: "Medium", desc: "Understanding" },
              { id: "hard", label: "Hard", desc: "Application" },
              { id: "mixed", label: "Mixed", desc: "Balanced Bloom" },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id as DifficultyLevel)}
                className={`p-2 rounded-lg text-left transition-all cursor-pointer ${
                  difficulty === d.id
                    ? "bg-amber-500 text-stone-950 shadow-xs dark:bg-amber-400"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                <div className="font-bold text-[11px]">{d.label}</div>
                <div className={`text-[10px] ${difficulty === d.id ? "text-stone-900/80" : "text-stone-500 dark:text-zinc-500"}`}>
                  {d.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Question Types */}
        <div className="space-y-2">
          <label className="font-bold text-stone-900 dark:text-stone-100 block">
            Question Types
          </label>
          <div className="flex flex-col gap-1.5">
            {[
              { id: "mcq", label: "Multiple Choice (4 options)" },
              { id: "true_false", label: "True / False" },
              { id: "fill_in_the_blank", label: "Fill-in-the-Blank" },
            ].map((t) => {
              const checked = selectedTypes.includes(t.id as QuestionType);
              return (
                <label
                  key={t.id}
                  onClick={() => toggleType(t.id as QuestionType)}
                  className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all select-none ${
                    checked
                      ? "bg-amber-500/10 border border-amber-500/30 text-stone-900 dark:text-stone-100"
                      : "bg-stone-50 text-stone-500 dark:bg-zinc-800/50 dark:text-zinc-400 border border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="h-3.5 w-3.5 rounded accent-amber-500 cursor-pointer"
                  />
                  <span className="font-medium text-[11px]">{t.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Button & Validation Badges */}
      <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-stone-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>2nd-pass fact-checking active</span>
          </div>
          <span className="hidden sm:inline text-stone-300 dark:text-zinc-700">•</span>
          <div className="flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-amber-500" />
            <span>Cosine embedding deduplication active</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-stone-950 shadow-md hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer dark:bg-amber-400 dark:hover:bg-amber-300"
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-950 border-t-transparent" />
              <span>Executing LLM formulation & 2nd-pass validation...</span>
            </div>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-stone-950" />
              <span>Forge & Validate {totalQuestions} Arrows</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* GENERATED QUIZ & VALIDATION REPORT SECTION */}
      {generatedQuestions.length > 0 && (
        <div className="mt-8 pt-6 border-t border-stone-200 dark:border-zinc-800 space-y-5">
          {/* TAB BAR: The Arrows (Quiz) vs Validation & Grounding Audit (Phase 5) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("quiz")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "quiz"
                    ? "bg-amber-500 text-stone-950 shadow-xs dark:bg-amber-400"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                <Target className="h-4 w-4" />
                <span>The Arrows (Quiz)</span>
                <span className="rounded-full bg-stone-950/15 px-1.5 py-0.2 text-[10px] font-semibold">
                  {generatedQuestions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("validation")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "validation"
                    ? "bg-amber-500 text-stone-950 shadow-xs dark:bg-amber-400"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Validation & Grounding Audit</span>
                {validationReport && validationReport.total_rejected > 0 ? (
                  <span className="rounded-full bg-red-500/20 text-red-700 dark:text-red-300 px-1.5 py-0.2 text-[10px] font-semibold">
                    {validationReport.total_rejected} Filtered
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[10px] font-semibold">
                    100% Verified
                  </span>
                )}
              </button>
            </div>

            {/* Inspect Raw Validation JSON Button */}
            {activeTab === "validation" && (
              <button
                type="button"
                onClick={() => setShowRawValidationJson(!showRawValidationJson)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>{showRawValidationJson ? "Hide JSON" : "Inspect Raw Validation JSON"}</span>
              </button>
            )}
          </div>

          {/* TAB 1: THE ARROWS (QUIZ VIEW) */}
          {activeTab === "quiz" && (
            <div className="space-y-4">
              {/* Interactive Quiz Launcher Callout Banner (Phase 6) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 p-5 dark:border-amber-500/30">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-stone-950 shadow-md">
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-stone-950 dark:text-stone-50 flex items-center gap-2">
                      <span>Ready for the Arena?</span>
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Phase 6</span>
                    </h4>
                    <p className="text-xs text-stone-700 dark:text-zinc-300 mt-0.5">
                      Release arrows one-by-one with arrow-style progression, optional timer, and instant review.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTakingQuiz(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 transition-all cursor-pointer shrink-0"
                >
                  <Target className="h-4 w-4" />
                  <span>Enter Quiz Arena (Release Arrows)</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Analytics Summary Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-100/70 p-4 text-xs dark:bg-zinc-800/50 border border-stone-200/60 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {generatedQuestions.length} Arrows Grounded & Verified
                  </span>
                  <span className="text-stone-400">•</span>
                  <span className="text-stone-500 dark:text-zinc-400">
                    Engine: <code className="font-mono text-amber-600 dark:text-amber-400">{modelUsed}</code>
                  </span>
                </div>

                {/* Bloom's Level Distribution Tags */}
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="rounded-md bg-blue-500/10 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    Recall: {bloomCounts.recall}
                  </span>
                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    Understanding: {bloomCounts.understanding}
                  </span>
                  <span className="rounded-md bg-purple-500/10 px-2 py-0.5 font-semibold text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    Application: {bloomCounts.application}
                  </span>
                </div>
              </div>

              {/* Question Cards List */}
              <div className="space-y-4">
                {generatedQuestions.map((q) => {
                  const isRevealed = !!revealedAnswers[q.arrow_order];
                  const isCopied = copiedId === `q-${q.arrow_order}`;

                  return (
                    <div
                      key={q.arrow_order}
                      className="rounded-2xl border border-stone-200 bg-stone-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-850 hover:border-amber-500/40 transition-all"
                    >
                      {/* Top Metadata Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-200/60 dark:border-zinc-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-amber-500/15 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30">
                            Arrow #{q.arrow_order}
                          </span>

                          <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white dark:bg-white dark:text-stone-950">
                            {q.type.replace(/_/g, " ")}
                          </span>

                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize border ${
                              q.bloom_level === "recall"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                : q.bloom_level === "understanding"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                            }`}
                          >
                            Bloom: {q.bloom_level}
                          </span>

                          <span className="rounded-md bg-stone-200/80 px-1.5 py-0.5 text-[10px] font-medium capitalize text-stone-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {q.difficulty}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <BookOpen className="h-3 w-3" />
                            <span>Source: Page {q.source_page}</span>
                          </span>

                          {/* Phase 5 Fact-Check Verification Pill */}
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <ShieldCheck className="h-3 w-3" />
                            <span>2nd-Pass Verified</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              copyQuestion(
                                `q-${q.arrow_order}`,
                                `${q.question}\n${q.options.map((opt, i) => `${i + 1}. ${opt}`).join("\n")}\nAnswer: ${q.correct_answer}\nExplanation: ${q.explanation}`
                              )
                            }
                            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-zinc-700 dark:hover:text-stone-200 transition-colors"
                            title="Copy question"
                          >
                            {isCopied ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleReveal(q.arrow_order)}
                            className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 cursor-pointer"
                          >
                            {isRevealed ? "Hide Answer" : "Reveal Answer"}
                          </button>
                        </div>
                      </div>

                      {/* Question Stem */}
                      <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-snug">
                        {q.question}
                      </h4>

                      {/* Options List */}
                      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((option, optIdx) => {
                          const isCorrect = isRevealed && option === q.correct_answer;
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all ${
                                isCorrect
                                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 font-semibold"
                                  : "border-stone-200 bg-white text-stone-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400"
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="leading-relaxed">{option}</span>
                              {isCorrect && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 ml-auto shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Grounded Source Passage & Explanation */}
                      {isRevealed && (
                        <div className="mt-4 pt-3.5 border-t border-stone-200/60 dark:border-zinc-800 space-y-2 text-xs">
                          {q.source_passage && (
                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
                              <div className="flex items-start gap-2">
                                <Target className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                <div>
                                  <strong className="block font-semibold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                    Exact Source Excerpt (Page {q.source_page}):
                                  </strong>
                                  <p className="mt-0.5 italic text-stone-800 dark:text-zinc-200">
                                    &quot;{q.source_passage}&quot;
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="rounded-xl bg-white p-3 dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800 text-stone-700 dark:text-zinc-300">
                            <strong className="text-stone-900 dark:text-stone-100 block mb-0.5">
                              Pedagogical Explanation:
                            </strong>
                            <p className="leading-relaxed">{q.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: VALIDATION & GROUNDING AUDIT (PHASE 5 CORE DIFFERENTIATOR) */}
          {activeTab === "validation" && validationReport && (
            <div className="space-y-6">
              {/* Raw JSON viewer if toggled */}
              {showRawValidationJson && (
                <div className="rounded-xl border border-stone-200 bg-stone-950 p-4 text-xs font-mono text-stone-100 dark:border-zinc-800 overflow-x-auto max-h-80">
                  <pre>{JSON.stringify(validationReport, null, 2)}</pre>
                </div>
              )}

              {/* 4 CORE KPI METRIC CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* 1. Accepted vs Processed */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 dark:bg-emerald-500/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                      Total Accepted
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-emerald-950 dark:text-emerald-100">
                    {validationReport.total_accepted}
                    <span className="text-xs font-normal text-stone-500 dark:text-zinc-400 ml-1">
                      / {validationReport.total_generated} generated
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                    {validationReport.summary_verdict}
                  </p>
                </div>

                {/* 2. Embedding Similarity Deduplication */}
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-700 dark:text-zinc-300">
                      Embedding Deduplication
                    </span>
                    <Scale className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {validationReport.near_duplicates_removed}
                    <span className="text-xs font-normal text-stone-500 dark:text-zinc-400 ml-1">
                      removed
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-stone-500 dark:text-zinc-400">
                    Threshold: &ge; {validationReport.similarity_threshold_used.toFixed(2)} cosine sim
                  </p>
                </div>

                {/* 3. Second-Pass LLM Grounding Check */}
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-700 dark:text-zinc-300">
                      2nd-Pass Fact-Check
                    </span>
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {validationReport.grounding_checks_passed}
                    <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 ml-1 font-semibold">
                      PASSED
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-stone-500 dark:text-zinc-400">
                    {validationReport.grounding_checks_failed > 0
                      ? `${validationReport.grounding_checks_failed} unsupported rejected`
                      : "Zero hallucinations detected"}
                  </p>
                </div>

                {/* 4. Schema Integrity & Repair Retries */}
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-700 dark:text-zinc-300">
                      Schema Retries
                    </span>
                    <Activity className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {validationReport.schema_retries_triggered}
                    <span className="text-xs font-normal text-stone-500 dark:text-zinc-400 ml-1">
                      triggered
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-stone-500 dark:text-zinc-400">
                    {validationReport.schema_retries_triggered === 0
                      ? "100% clean 1st-pass JSON"
                      : "Self-healed on retry"}
                  </p>
                </div>
              </div>

              {/* REJECTION AUDIT LOG (If any questions were filtered) */}
              {validationReport.rejections.length > 0 && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 dark:bg-red-500/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-900 dark:text-red-200">
                      Quarantine Log ({validationReport.rejections.length} Question(s) Weeded Out)
                    </h4>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-zinc-300">
                    These candidate questions were discarded or regenerated to protect quiz quality and guarantee 100% academic rigor:
                  </p>

                  <div className="space-y-2.5">
                    {validationReport.rejections.map((rej, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-red-200 bg-white p-3 text-xs dark:border-red-950 dark:bg-zinc-900"
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:bg-red-900/50 dark:text-red-300">
                            {rej.reason_category}
                          </span>
                          {rej.similarity_score && (
                            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                              Cosine Sim: {rej.similarity_score.toFixed(3)}
                            </span>
                          )}
                          {rej.source_page && (
                            <span className="text-[10px] text-stone-400 dark:text-zinc-500">
                              Page {rej.source_page}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-stone-900 dark:text-stone-100">
                          &quot;{rej.question}&quot;
                        </p>
                        <p className="mt-1 text-stone-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                          {rej.details}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECOND-PASS FACT-CHECKING AUDIT TABLE */}
              <div className="rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
                <div className="p-4 border-b border-stone-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>2nd-Pass LLM Grounding & Fact-Check Audit</span>
                    </h4>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 mt-0.5">
                      Every question is audited against the source text to ensure the correct answer is directly substantiated.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    Engine: {validationReport.verifier_model_used}
                  </span>
                </div>

                <div className="divide-y divide-stone-100 dark:divide-zinc-800/80">
                  {validationReport.grounding_checks.map((check) => (
                    <div key={check.arrow_order} className="p-4 hover:bg-stone-50/50 dark:hover:bg-zinc-850/50 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 px-2 items-center justify-center rounded-md bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-950 text-[10px] font-bold">
                            Arrow #{check.arrow_order}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{check.verdict} ({Math.round(check.confidence * 100)}% Confidence)</span>
                          </span>
                          <span className="text-[11px] text-stone-400 dark:text-zinc-500">
                            Source Page {check.source_page}
                          </span>
                        </div>
                      </div>

                      <h5 className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                        {check.question}
                      </h5>

                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-stone-50 p-2.5 dark:bg-zinc-800/50 border border-stone-200/60 dark:border-zinc-800">
                          <strong className="block text-[10px] uppercase font-bold text-stone-500 dark:text-zinc-400 mb-0.5">
                            Verified Answer:
                          </strong>
                          <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                            {check.correct_answer}
                          </span>
                        </div>

                        <div className="rounded-lg bg-amber-500/5 p-2.5 dark:bg-amber-500/10 border border-amber-500/20">
                          <strong className="block text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 mb-0.5">
                            Entailment Rationale:
                          </strong>
                          <span className="text-stone-700 dark:text-zinc-300 text-[11px]">
                            {check.reason}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
