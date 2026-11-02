"use client";

import React, { useState } from "react";
import { ChevronRight, ArrowRight, Check } from "lucide-react";

interface ArrowProgressBarProps {
  totalQuestions?: number;
  initialQuestion?: number;
}

/**
 * ArrowProgressBar: Demonstrates the Quivers concept where each arrow represents
 * a question in the quiver, progressing sequentially toward mastery.
 */
export function ArrowProgressBar({
  totalQuestions = 6,
  initialQuestion = 2,
}: ArrowProgressBarProps) {
  const [current, setCurrent] = useState(initialQuestion);

  return (
    <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-colors">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">
            Arrow Motif Concept
          </span>
          <h4 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Arrow-Style Quiz Progress
          </h4>
        </div>
        <div className="text-xs font-medium text-stone-500 dark:text-zinc-400">
          Arrow <span className="font-bold text-stone-900 dark:text-white">{current + 1}</span> of {totalQuestions}
        </div>
      </div>

      {/* The Arrow Progress Track */}
      <div className="relative flex w-full items-center justify-between gap-1 sm:gap-2 overflow-x-auto py-2">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const isDone = idx < current;
          const isActive = idx === current;
          const isUpcoming = idx > current;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrent(idx)}
              className={`group relative flex-1 min-w-[50px] flex items-center justify-center py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                isDone
                  ? "bg-stone-900 text-white dark:bg-zinc-800 dark:text-amber-400 border border-stone-800 dark:border-zinc-700"
                  : isActive
                  ? "bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20 ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
                  : "bg-stone-100 text-stone-400 dark:bg-zinc-800/40 dark:text-zinc-600 border border-stone-200 dark:border-zinc-800"
              }`}
            >
              {/* Arrow shaft and tip iconography */}
              <div className="flex items-center gap-1">
                {isDone ? (
                  <Check className="h-3 w-3 stroke-[3]" />
                ) : (
                  <span>Q{idx + 1}</span>
                )}
                {/* Arrowhead chevron pointing to next question */}
                {idx < totalQuestions - 1 && (
                  <ChevronRight
                    className={`h-3 w-3 ${
                      isActive ? "text-stone-950" : isDone ? "text-stone-400" : "text-stone-300 dark:text-zinc-700"
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive controls */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-zinc-800/60 text-xs">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          className="rounded-md px-2.5 py-1 text-stone-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none"
        >
          Previous Arrow
        </button>

        <span className="text-[11px] text-stone-400 dark:text-zinc-500 italic">
          Click any arrow or step through
        </span>

        <button
          type="button"
          disabled={current === totalQuestions - 1}
          onClick={() => setCurrent((c) => Math.min(totalQuestions - 1, c + 1))}
          className="inline-flex items-center gap-1 rounded-md bg-stone-900 px-2.5 py-1 text-white hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 font-semibold disabled:opacity-30 disabled:pointer-events-none"
        >
          <span>Next Arrow</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
