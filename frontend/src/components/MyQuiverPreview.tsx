"use client";

import React from "react";
import { Layers, FileText, Target, Play, ArrowRight, Clock, Award } from "lucide-react";

interface SavedQuiver {
  id: string;
  title: string;
  documentName: string;
  arrowCount: number;
  bullseyeRate: number; // percentage
  lastFired: string;
  pages: number;
}

const mockQuivers: SavedQuiver[] = [
  {
    id: "q-1",
    title: "Deep Learning & Transformer Architectures",
    documentName: "Attention_Is_All_You_Need.pdf",
    arrowCount: 15,
    bullseyeRate: 93,
    lastFired: "2 hours ago",
    pages: 15,
  },
  {
    id: "q-2",
    title: "Operating Systems: Concurrency & Virtual Memory",
    documentName: "OS_Lecture_Notes_Ch7.pdf",
    arrowCount: 20,
    bullseyeRate: 85,
    lastFired: "Yesterday",
    pages: 32,
  },
  {
    id: "q-3",
    title: "Computer Networks: TCP/IP Flow Control",
    documentName: "Kurose_Ross_Chapter3.pdf",
    arrowCount: 12,
    bullseyeRate: 75,
    lastFired: "3 days ago",
    pages: 24,
  },
];

/**
 * MyQuiverPreview: Previews the saved-quizzes screen showcasing the
 * "My Quiver" concept where each document yields a quiver of arrows (questions).
 */
export function MyQuiverPreview() {
  return (
    <section id="my-quiver-preview" className="w-full scroll-mt-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="h-4 w-4" />
            <span>Saved Quizzes</span>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
            My Quiver
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400 mt-1">
            Your personal collection of question sets forged from uploaded documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-stone-100 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold text-stone-700 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
            Total Arrows Loaded: <strong className="text-amber-600 dark:text-amber-400">47</strong>
          </span>
        </div>
      </div>

      {/* Grid of Saved Quivers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {mockQuivers.map((quiver) => (
          <div
            key={quiver.id}
            className="group relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-amber-500/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-400/50 transition-all"
          >
            <div>
              {/* Header tags */}
              <div className="flex items-center justify-between text-xs text-stone-400 dark:text-zinc-500 mb-3">
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[130px]">{quiver.documentName}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{quiver.lastFired}</span>
                </span>
              </div>

              {/* Title */}
              <h4 className="font-semibold text-sm sm:text-base text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {quiver.title}
              </h4>

              {/* Arrow Count & Bullseye Metric */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-stone-50 dark:bg-zinc-800/60 p-2.5 border border-stone-100 dark:border-zinc-800">
                  <span className="text-[11px] text-stone-500 dark:text-zinc-400 block">
                    Arrows (Questions)
                  </span>
                  <span className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {quiver.arrowCount} arrows
                  </span>
                </div>

                <div className="rounded-xl bg-stone-50 dark:bg-zinc-800/60 p-2.5 border border-stone-100 dark:border-zinc-800">
                  <span className="text-[11px] text-stone-500 dark:text-zinc-400 block flex items-center gap-1">
                    <Target className="h-3 w-3 text-amber-500" />
                    Bullseye Rate
                  </span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {quiver.bullseyeRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="mt-5 pt-3 border-t border-stone-100 dark:border-zinc-800/70 flex items-center justify-between">
              <span className="text-[11px] text-stone-400 dark:text-zinc-500">
                {quiver.pages} source pages
              </span>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-amber-500 group-hover:text-stone-950 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-amber-500 dark:group-hover:text-stone-950 transition-all"
              >
                <span>Draw Arrow</span>
                <Play className="h-3 w-3 fill-current" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
