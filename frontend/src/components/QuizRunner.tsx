"use client";

/**
 * Interactive Quiz Runner & Results Component (Phase 6).
 * Follows the Quivers Phase 0 Archery Design System:
 * - One question at a time with arrow-style progress bar.
 * - Optional timer (per-question or total quiz countdown).
 * - Next / Previous navigation with direct arrow track jumping.
 * - Results screen: score, time spent, per-question review with explanation
 *   and source page citation, and an actionable list of topics answered incorrectly.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  BookOpen,
  Award,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Check,
  Pause,
  Play,
  X,
  Layers,
  HelpCircle,
  Compass,
} from "lucide-react";
import {
  GeneratedQuestion,
  UserAnswerRecord,
  MissedTopic,
  QuizResults,
  TextChunk,
  saveQuizAttempt,
  generateAdaptiveRetryQuiz,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

interface QuizRunnerProps {
  questions: GeneratedQuestion[];
  quizTitle?: string;
  quizId?: string;
  contextChunks?: TextChunk[];
  onExit?: () => void;
  onFinish?: (results: QuizResults) => void;
}

type TimerMode = "none" | "30s" | "60s" | "total";

export function QuizRunner({
  questions,
  quizTitle = "Document Quiz",
  quizId,
  contextChunks,
  onExit,
  onFinish,
}: QuizRunnerProps) {
  const { session } = useAuth();

  // Active Questions & Adaptive Flight State (Phase 9)
  const [activeQuestions, setActiveQuestions] = useState<GeneratedQuestion[]>(questions);
  const [activeTitle, setActiveTitle] = useState<string>(quizTitle);
  const [isAdaptiveMode, setIsAdaptiveMode] = useState<boolean>(false);
  const [isGeneratingAdaptive, setIsGeneratingAdaptive] = useState<boolean>(false);
  const [adaptiveError, setAdaptiveError] = useState<string | null>(null);

  useEffect(() => {
    setActiveQuestions(questions);
    setActiveTitle(quizTitle);
    setIsAdaptiveMode(false);
  }, [questions, quizTitle]);

  // Navigation & State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<number, number>>({
    0: Date.now(),
  });
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [finalResults, setFinalResults] = useState<QuizResults | null>(null);

  // Timer Configuration State
  const [timerMode, setTimerMode] = useState<TimerMode>("none");
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const quizStartTime = useRef<number>(Date.now());

  // Review Filter State on Results Screen
  const [resultsFilter, setResultsFilter] = useState<"all" | "incorrect" | "correct">("all");

  const totalQuestions = activeQuestions.length;
  const currentQuestion = activeQuestions[currentIndex];

  // Initialize or update timer when question changes or mode changes
  useEffect(() => {
    if (timerMode === "30s") {
      setSecondsRemaining(30);
    } else if (timerMode === "60s") {
      setSecondsRemaining(60);
    } else if (timerMode === "total" && secondsRemaining === null) {
      setSecondsRemaining(totalQuestions * 45); // 45s per question total
    } else if (timerMode === "none") {
      setSecondsRemaining(null);
    }
  }, [currentIndex, timerMode, totalQuestions]);

  // Timer countdown ticker
  useEffect(() => {
    if (isFinished || isTimerPaused || secondsRemaining === null || secondsRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Time expired for this question or quiz
          clearInterval(timer);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, isTimerPaused, secondsRemaining, currentIndex, timerMode]);

  // Handle timer expiry
  const handleTimeExpired = () => {
    if (timerMode === "total") {
      // End entire quiz
      finishQuiz();
    } else {
      // Move to next question if available, else finish
      if (currentIndex < totalQuestions - 1) {
        goToNext();
      } else {
        finishQuiz();
      }
    }
  };

  const handleSelectOption = (option: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: option,
    }));
  };

  const recordTimeForCurrentQuestion = () => {
    const started = questionStartTimes[currentIndex] || Date.now();
    const elapsed = Math.round((Date.now() - started) / 1000);
    setTimeSpentPerQuestion((prev) => ({
      ...prev,
      [currentIndex]: (prev[currentIndex] || 0) + elapsed,
    }));
  };

  const goToNext = () => {
    recordTimeForCurrentQuestion();
    if (currentIndex < totalQuestions - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setQuestionStartTimes((prev) => ({
        ...prev,
        [nextIdx]: Date.now(),
      }));
    } else {
      finishQuiz();
    }
  };

  const goToPrevious = () => {
    recordTimeForCurrentQuestion();
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setQuestionStartTimes((prev) => ({
        ...prev,
        [prevIdx]: Date.now(),
      }));
    }
  };

  const jumpToQuestion = (targetIdx: number) => {
    recordTimeForCurrentQuestion();
    setCurrentIndex(targetIdx);
    setQuestionStartTimes((prev) => ({
      ...prev,
      [targetIdx]: Date.now(),
    }));
  };

  const finishQuiz = () => {
    recordTimeForCurrentQuestion();

    let correctCount = 0;
    const answerRecords: UserAnswerRecord[] = [];
    const missedTopicMap: Record<string, { source_page: number; stems: string[] }> = {};

    activeQuestions.forEach((q, idx) => {
      const userAns = userAnswers[idx] || "";
      const isCorrect = userAns.trim() === q.correct_answer.trim();
      if (isCorrect) {
        correctCount += 1;
      } else {
        const topicKey = q.heading || `Page ${q.source_page}`;
        if (!missedTopicMap[topicKey]) {
          missedTopicMap[topicKey] = {
            source_page: q.source_page,
            stems: [],
          };
        }
        missedTopicMap[topicKey].stems.push(q.question);
      }

      answerRecords.push({
        arrow_order: q.arrow_order,
        question: q.question,
        user_answer: userAns || "Unanswered",
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        time_spent_seconds: timeSpentPerQuestion[idx] || 15,
        heading: q.heading,
        source_page: q.source_page,
        source_passage: q.source_passage,
        explanation: q.explanation,
        bloom_level: q.bloom_level,
      });
    });

    const missedTopics: MissedTopic[] = Object.entries(missedTopicMap).map(([heading, data]) => ({
      heading,
      source_page: data.source_page,
      missed_count: data.stems.length,
      question_stems: data.stems,
    }));

    const totalSeconds = Math.round((Date.now() - quizStartTime.current) / 1000);
    const scorePct = Math.round((correctCount / totalQuestions) * 100);

    const results: QuizResults = {
      total_questions: totalQuestions,
      correct_count: correctCount,
      incorrect_count: totalQuestions - correctCount,
      score_percentage: scorePct,
      total_time_seconds: totalSeconds,
      answers: answerRecords,
      missed_topics: missedTopics,
    };

    setFinalResults(results);
    setIsFinished(true);

    // If authenticated, automatically log attempt flight record to Supabase backend
    if (session?.access_token) {
      saveQuizAttempt(session.access_token, {
        quiz_id: quizId || "session-quiz",
        score: correctCount,
        total_arrows: totalQuestions,
        bullseye_percentage: scorePct,
        time_spent_seconds: totalSeconds,
        answers: answerRecords,
      }).catch((err) => {
        console.warn("Notice: Could not sync attempt to backend history:", err);
      });
    }

    if (onFinish) {
      onFinish(results);
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setUserAnswers({});
    setQuestionStartTimes({ 0: Date.now() });
    setTimeSpentPerQuestion({});
    setIsFinished(false);
    setFinalResults(null);
    quizStartTime.current = Date.now();
    if (timerMode === "30s") setSecondsRemaining(30);
    else if (timerMode === "60s") setSecondsRemaining(60);
    else if (timerMode === "total") setSecondsRemaining(totalQuestions * 45);
  };

  const handleAdaptiveRetry = async () => {
    if (!finalResults || finalResults.missed_topics.length === 0) return;
    setIsGeneratingAdaptive(true);
    setAdaptiveError(null);

    try {
      const missedInputs = finalResults.missed_topics.map((t) => {
        const matchingAnswers = finalResults.answers.filter(
          (a) => !a.is_correct && a.heading === t.heading
        );
        return {
          heading: t.heading,
          source_page: t.source_page,
          missed_count: t.missed_count,
          question_stems: t.question_stems,
          source_passage: matchingAnswers[0]?.source_passage || null,
        };
      });

      const res = await generateAdaptiveRetryQuiz({
        quiz_id: quizId || null,
        original_quiz_title: activeTitle,
        missed_topics: missedInputs,
        total_questions: Math.max(2, Math.min(6, finalResults.missed_topics.length * 2)),
        context_chunks: contextChunks || null,
      });

      if (res.questions && res.questions.length > 0) {
        setActiveQuestions(res.questions);
        setActiveTitle(res.adaptive_quiz_title);
        setIsAdaptiveMode(true);
        setCurrentIndex(0);
        setUserAnswers({});
        setQuestionStartTimes({ 0: Date.now() });
        setTimeSpentPerQuestion({});
        setIsFinished(false);
        setFinalResults(null);
        quizStartTime.current = Date.now();
      } else {
        setAdaptiveError("No adaptive questions could be formulated for these topics.");
      }
    } catch (err: any) {
      setAdaptiveError(err.message || "Failed to generate adaptive retry quiz.");
    } finally {
      setIsGeneratingAdaptive(false);
    }
  };

  const answeredCount = Object.keys(userAnswers).filter(
    (k) => userAnswers[Number(k)] && userAnswers[Number(k)].trim() !== ""
  ).length;

  // Format seconds mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  // Determine Mastery Badge for Results Screen
  const getMasteryTier = (pct: number) => {
    if (pct === 100) return { title: "Bullseye Master", motif: "🎯", color: "emerald", desc: "Flawless accuracy! Every arrow found the center mark." };
    if (pct >= 80) return { title: "Sharpshooter", motif: "🏹", color: "amber", desc: "Superb precision! Deep understanding of document concepts." };
    if (pct >= 60) return { title: "Marksman", motif: "🎯", color: "blue", desc: "Solid grasp of foundational principles with minor gaps." };
    return { title: "Archer in Training", motif: "🏹", color: "stone", desc: "Foundations in progress. Review the missed topics below." };
  };

  // ==========================================
  // VIEW 1: RESULTS SCREEN
  // ==========================================
  if (isFinished && finalResults) {
    const tier = getMasteryTier(finalResults.score_percentage);
    const filteredAnswers = finalResults.answers.filter((ans) => {
      if (resultsFilter === "correct") return ans.is_correct;
      if (resultsFilter === "incorrect") return !ans.is_correct;
      return true;
    });

    return (
      <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 transition-all">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-stone-100 dark:border-zinc-800 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                Quiver Completed • Flight Report
              </span>
              {isAdaptiveMode && (
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  🎯 Adaptive Remediation
                </span>
              )}
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
              Quiz Evaluation & Accuracy
            </h3>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
              {activeTitle} • {totalQuestions} Arrows Released • Total Time: {formatTime(finalResults.total_time_seconds)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {finalResults.missed_topics.length > 0 && (
              <button
                type="button"
                onClick={handleAdaptiveRetry}
                disabled={isGeneratingAdaptive}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`h-3.5 w-3.5 ${isGeneratingAdaptive ? "animate-spin" : ""}`} />
                <span>{isGeneratingAdaptive ? "Forging Adaptive Quiver..." : "Adaptive Retry on Missed Topics"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={restartQuiz}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retake Quiz</span>
            </button>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 transition-all cursor-pointer"
              >
                <span>Back to Setup</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Adaptive error if failed */}
        {adaptiveError && (
          <div className="my-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {adaptiveError}
          </div>
        )}

        {/* HERO SCORE & MASTERY SUMMARY */}
        <div className="my-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Score & Accuracy Card with Bullseye Motif */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 text-center sm:text-left flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Accuracy Score
              </span>
              <Target className="h-5 w-5 text-amber-500" />
            </div>

            <div className="my-3">
              <div className="text-4xl sm:text-5xl font-extrabold text-stone-950 dark:text-white tracking-tight">
                {finalResults.score_percentage}%
              </div>
              <p className="text-xs font-semibold text-stone-600 dark:text-zinc-300 mt-1">
                {finalResults.correct_count} of {totalQuestions} Arrows on Target
              </p>
            </div>

            <div className="pt-2 border-t border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
              Average pace: {Math.round(finalResults.total_time_seconds / totalQuestions)}s per arrow
            </div>
          </div>

          {/* 2. Mastery Tier Card */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 dark:border-zinc-800 dark:bg-zinc-800/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                Archery Rank
              </span>
              <Award className="h-5 w-5 text-amber-500" />
            </div>

            <div className="my-3">
              <div className="inline-flex items-center gap-2">
                <span className="text-2xl">{tier.motif}</span>
                <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {tier.title}
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-zinc-400 mt-1 leading-relaxed">
                {tier.desc}
              </p>
            </div>

            <div className="pt-2 border-t border-stone-200/80 dark:border-zinc-700/60 text-[11px] text-stone-500 dark:text-zinc-400">
              Based on strict source grounding validation
            </div>
          </div>

          {/* 3. Knowledge Gaps Overview */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 dark:border-zinc-800 dark:bg-zinc-800/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                Knowledge Gaps
              </span>
              <Compass className="h-5 w-5 text-stone-400" />
            </div>

            <div className="my-3">
              <div className="text-3xl font-extrabold text-stone-900 dark:text-stone-100">
                {finalResults.missed_topics.length}
                <span className="text-sm font-normal text-stone-500 dark:text-zinc-400 ml-1.5">
                  topic(s) to review
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-zinc-400 mt-1">
                {finalResults.missed_topics.length === 0
                  ? "Flawless quiz! No knowledge gaps detected."
                  : "Targeted sections identified for study."}
              </p>
            </div>

            <div className="pt-2 border-t border-stone-200/80 dark:border-zinc-700/60 text-[11px] text-stone-500 dark:text-zinc-400">
              {finalResults.incorrect_count} missed arrow(s) across document
            </div>
          </div>
        </div>

        {/* LIST OF TOPICS ANSWERED INCORRECTLY (Knowledge Gap Analysis) */}
        {finalResults.missed_topics.length > 0 && (
          <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 dark:bg-amber-500/10 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Identified Knowledge Gaps ({finalResults.missed_topics.length} Section(s) Missed)
              </h4>
            </div>
            <p className="text-xs text-stone-600 dark:text-zinc-300">
              Review these specific document chapters and page citations before your viva examination:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {finalResults.missed_topics.map((t, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-amber-500/20 bg-white p-4 text-xs dark:border-zinc-800 dark:bg-zinc-850"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {t.heading}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-amber-500 dark:text-stone-950">
                      <BookOpen className="h-3 w-3" />
                      <span>Page {t.source_page}</span>
                    </span>
                  </div>
                  <p className="text-stone-500 dark:text-zinc-400 text-[11px]">
                    {t.missed_count} question(s) missed in this topic area.
                  </p>
                  <div className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <span>Study Action: Re-read Page {t.source_page} excerpt.</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Phase 9 Adaptive Remediation CTA */}
            <div className="mt-3 pt-3 border-t border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-amber-900 dark:text-amber-200">
                <strong className="font-bold">Phase 9 Adaptive Remediation: </strong>
                <span>
                  Reforge a fresh quiver targeted exclusively at these {finalResults.missed_topics.length} missed section(s) with novel, non-repeating arrows.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAdaptiveRetry}
                disabled={isGeneratingAdaptive}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <Target className={`h-3.5 w-3.5 ${isGeneratingAdaptive ? "animate-spin" : ""}`} />
                <span>{isGeneratingAdaptive ? "Forging Quiver..." : "Launch Adaptive Retry Flight"}</span>
              </button>
            </div>
          </div>
        )}

        {/* PER-QUESTION REVIEW SECTION */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-stone-200 dark:border-zinc-800">
            <h4 className="text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-500" />
              <span>Per-Arrow Review & Grounding Citations</span>
            </h4>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setResultsFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  resultsFilter === "all"
                    ? "bg-stone-900 text-white dark:bg-white dark:text-stone-950"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                All ({totalQuestions})
              </button>
              <button
                type="button"
                onClick={() => setResultsFilter("incorrect")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  resultsFilter === "incorrect"
                    ? "bg-red-600 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                Missed ({finalResults.incorrect_count})
              </button>
              <button
                type="button"
                onClick={() => setResultsFilter("correct")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  resultsFilter === "correct"
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                Correct ({finalResults.correct_count})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredAnswers.map((ans) => (
              <div
                key={ans.arrow_order}
                className={`rounded-2xl border p-5 transition-all ${
                  ans.is_correct
                    ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                    : "border-red-500/30 bg-red-500/5 dark:bg-red-500/10"
                }`}
              >
                {/* Review Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-200/60 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-stone-900 text-xs font-bold text-white dark:bg-amber-500 dark:text-stone-950">
                      Arrow #{ans.arrow_order}
                    </span>

                    {ans.is_correct ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Bullseye!</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-300">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Missed Mark</span>
                      </span>
                    )}

                    <span className="rounded-md bg-stone-200/80 px-2 py-0.5 text-[10px] font-semibold capitalize text-stone-700 dark:bg-zinc-800 dark:text-zinc-300">
                      Bloom: {ans.bloom_level}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      <BookOpen className="h-3 w-3" />
                      <span>Source: Page {ans.source_page}</span>
                    </span>
                  </div>

                  <span className="text-[11px] text-stone-400 dark:text-zinc-500">
                    Pace: {ans.time_spent_seconds}s
                  </span>
                </div>

                {/* Question Text */}
                <h5 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-snug">
                  {ans.question}
                </h5>

                {/* User Answer vs Correct Answer */}
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div
                    className={`rounded-xl p-3 border ${
                      ans.is_correct
                        ? "border-emerald-500/40 bg-white dark:bg-zinc-900 text-emerald-950 dark:text-emerald-100"
                        : "border-red-500/40 bg-white dark:bg-zinc-900 text-red-950 dark:text-red-100"
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold text-stone-400 mb-0.5">
                      Your Selected Choice:
                    </span>
                    <span className="font-semibold">{ans.user_answer}</span>
                  </div>

                  {!ans.is_correct && (
                    <div className="rounded-xl p-3 border border-emerald-500/40 bg-white dark:bg-zinc-900 text-emerald-950 dark:text-emerald-100">
                      <span className="block text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                        Correct Answer:
                      </span>
                      <span className="font-semibold">{ans.correct_answer}</span>
                    </div>
                  )}
                </div>

                {/* Grounding Source Passage & Pedagogical Explanation */}
                <div className="mt-4 pt-3 border-t border-stone-200/60 dark:border-zinc-800 space-y-2 text-xs">
                  {ans.source_passage && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
                      <div className="flex items-start gap-2">
                        <Target className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <strong className="block font-semibold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            Exact Source Excerpt (Page {ans.source_page}):
                          </strong>
                          <p className="mt-0.5 italic text-stone-800 dark:text-zinc-200">
                            &quot;{ans.source_passage}&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl bg-white p-3 dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800 text-stone-700 dark:text-zinc-300">
                    <strong className="text-stone-900 dark:text-stone-100 block mb-0.5">
                      Explanation:
                    </strong>
                    <p className="leading-relaxed">{ans.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ACTIVE QUIZ RUNNER (ONE QUESTION AT A TIME)
  // ==========================================
  const selectedAnswer = userAnswers[currentIndex] || "";
  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 transition-all">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-stone-100 dark:border-zinc-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                Phase 6 • The Arena
              </span>
              {isAdaptiveMode && (
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  🎯 Phase 9 Adaptive Remediation
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50 truncate max-w-sm sm:max-w-md">
              {activeTitle}
            </h3>
          </div>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-2">
          {/* Timer Mode Selector */}
          <div className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 dark:bg-zinc-800 text-xs">
            {(["none", "30s", "60s"] as TimerMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTimerMode(mode)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  timerMode === mode
                    ? "bg-white text-stone-900 shadow-xs dark:bg-zinc-700 dark:text-white"
                    : "text-stone-500 hover:text-stone-800 dark:text-zinc-400"
                }`}
              >
                {mode === "none" ? "No Timer" : mode}
              </button>
            ))}
          </div>

          {/* Running Timer Badge */}
          {secondsRemaining !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all ${
                secondsRemaining <= 10
                  ? "border-red-500 bg-red-500/10 text-red-600 animate-pulse"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTime(secondsRemaining)}</span>
              <button
                type="button"
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                className="ml-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                title={isTimerPaused ? "Resume" : "Pause"}
              >
                {isTimerPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </button>
            </div>
          )}

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-zinc-800 dark:hover:text-stone-200 transition-colors"
              title="Exit Quiz"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ARROW-STYLE PROGRESS BAR */}
      <div className="py-5 border-b border-stone-100 dark:border-zinc-800">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-stone-600 dark:text-zinc-400">
            Arrow Progression ({answeredCount} of {totalQuestions} answered)
          </span>
          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
            Arrow #{currentIndex + 1} of {totalQuestions}
          </span>
        </div>

        {/* Arrow Track */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1">
          {activeQuestions.map((q, idx) => {
            const isAnswered = !!userAnswers[idx];
            const isActive = idx === currentIndex;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => jumpToQuestion(idx)}
                className={`group relative flex-1 min-w-[48px] py-2 px-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                  isActive
                    ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20 ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
                    : isAnswered
                    ? "bg-stone-900 text-white dark:bg-zinc-800 dark:text-amber-400 border border-stone-800 dark:border-zinc-700"
                    : "bg-stone-100 text-stone-400 dark:bg-zinc-800/40 dark:text-zinc-600 border border-stone-200 dark:border-zinc-800 hover:border-amber-400"
                }`}
              >
                <div className="flex items-center gap-1">
                  {isAnswered && !isActive ? (
                    <Check className="h-3 w-3 stroke-[3]" />
                  ) : (
                    <span>A{idx + 1}</span>
                  )}
                  {idx < totalQuestions - 1 && (
                    <ChevronRight
                      className={`h-3 w-3 ${
                        isActive
                          ? "text-stone-950"
                          : isAnswered
                          ? "text-stone-400"
                          : "text-stone-300 dark:text-zinc-700"
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* QUESTION STAGE */}
      <div className="py-6 space-y-5">
        {/* Metadata Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-amber-500/15 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30">
            Arrow #{currentQuestion.arrow_order}
          </span>

          <span className="rounded-md bg-stone-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white dark:bg-white dark:text-stone-950">
            {currentQuestion.type.replace(/_/g, " ")}
          </span>

          <span
            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold capitalize border ${
              currentQuestion.bloom_level === "recall"
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                : currentQuestion.bloom_level === "understanding"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
            }`}
          >
            Bloom: {currentQuestion.bloom_level}
          </span>

          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <BookOpen className="h-3 w-3" />
            <span>Grounded in Page {currentQuestion.source_page}</span>
          </span>
        </div>

        {/* Question Stem */}
        <h4 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-50 leading-relaxed">
          {currentQuestion.question}
        </h4>

        {/* Options List */}
        <div className="space-y-3 pt-2">
          {currentQuestion.options.map((option, optIdx) => {
            const isSelected = selectedAnswer === option;

            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => handleSelectOption(option)}
                className={`w-full text-left p-4 rounded-xl text-sm font-medium transition-all flex items-center justify-between border cursor-pointer ${
                  isSelected
                    ? "border-amber-500 bg-amber-500/10 text-stone-950 dark:text-stone-50 ring-2 ring-amber-400/50 shadow-sm"
                    : "border-stone-200 bg-stone-50/50 hover:bg-stone-100 hover:border-amber-400/50 dark:border-zinc-800 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-stone-800 dark:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-amber-500 text-stone-950"
                        : "bg-stone-200/80 text-stone-700 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="leading-snug">{option}</span>
                </div>

                {isSelected && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-stone-950 ml-2">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FOOTER NAVIGATION */}
      <div className="pt-6 border-t border-stone-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={goToPrevious}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Previous Arrow</span>
        </button>

        <div className="text-xs text-stone-500 dark:text-zinc-400 text-center">
          {selectedAnswer ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="h-3.5 w-3.5" />
              <span>Arrow nocked and ready</span>
            </span>
          ) : (
            <span className="italic">Select a choice to nock your arrow</span>
          )}
        </div>

        {isLastQuestion ? (
          <button
            type="button"
            onClick={finishQuiz}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 transition-all cursor-pointer"
          >
            <Target className="h-4 w-4" />
            <span>Submit Quiver & View Score</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={goToNext}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-xs font-bold text-stone-950 shadow-md hover:bg-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300 transition-all cursor-pointer"
          >
            <span>Next Arrow</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

