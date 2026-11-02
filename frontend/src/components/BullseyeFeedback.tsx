"use client";

import React, { useState } from "react";
import { Check, Target, Sparkles, BookOpen } from "lucide-react";

/**
 * BullseyeFeedback: Displays the bullseye target motif for correct answers
 * and demonstrates source grounding citation previews.
 */
export function BullseyeFeedback() {
  const [selectedOption, setSelectedOption] = useState<number | null>(1); // default to correct answer

  const questionData = {
    question: "How does the Self-Attention mechanism compute relevance between tokens?",
    options: [
      "By hashing token strings into fixed-size integers",
      "Using scaled dot-products between Query and Key vectors (Q · Kᵀ / √dₖ)",
      "Through recurrent hidden state propagations step-by-step",
      "By discarding positional encodings after embedding",
    ],
    correctIndex: 1,
    citation: "Attention Is All You Need (Vaswani et al.), Section 3.2.1, Page 4.",
  };

  return (
    <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-colors">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">
            Arrow Motif Concept
          </span>
          <h4 className="text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>Bullseye Accuracy Feedback</span>
            <Target className="h-4 w-4 text-amber-500 animate-bullseye" />
          </h4>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Source Grounded
        </span>
      </div>

      {/* Simulated Question */}
      <p className="text-sm font-medium text-stone-800 dark:text-stone-200 mb-4">
        {questionData.question}
      </p>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {questionData.options.map((opt, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = idx === questionData.correctIndex;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedOption(idx)}
              className={`w-full text-left p-3 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-between border ${
                isSelected && isCorrect
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                  : isSelected && !isCorrect
                  ? "border-red-500 bg-red-500/10 text-red-950 dark:text-red-200"
                  : "border-stone-200 hover:border-stone-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-stone-50/50 dark:bg-zinc-800/40 text-stone-700 dark:text-zinc-300"
              }`}
            >
              <span>{opt}</span>
              {isSelected && isCorrect && (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  <span className="text-xs">Bullseye!</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Grounding Citation Banner */}
      {selectedOption === questionData.correctIndex && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 dark:bg-amber-500/10 text-xs transition-all">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300 mb-1">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Verified Source Citation:</span>
          </div>
          <p className="text-stone-600 dark:text-zinc-400">
            {questionData.citation}
          </p>
        </div>
      )}
    </div>
  );
}
