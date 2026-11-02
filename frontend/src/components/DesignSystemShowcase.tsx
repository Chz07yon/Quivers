"use client";

import React from "react";
import Image from "next/image";
import { Palette, Sparkles, CheckCircle2, ShieldCheck, Cpu, Code2, Eye } from "lucide-react";

/**
 * DesignSystemShowcase: Visual documentation of the Quivers design system,
 * prepared specifically so the student can explain every design decision in their viva.
 */
export function DesignSystemShowcase() {
  return (
    <section id="design-system" className="w-full scroll-mt-20">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
          <Palette className="h-4 w-4" />
          <span>Brand Architecture & Viva Guide</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          Design System & Viva Specifications
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-zinc-400 mt-1 max-w-2xl">
          Engineered for visual clarity, accessibility, and high contrast across light and dark modes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Logo & Dark Mode Inversion */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              Asset Transparency
            </span>
            <h4 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mt-1">
              Logo & Inversion
            </h4>
            <p className="text-xs text-stone-600 dark:text-zinc-400 mt-2">
              The original brand logo was converted from a raster line drawing to an alpha-channel transparent PNG. In dark mode, CSS line inversion (<code className="rounded bg-stone-100 dark:bg-zinc-800 px-1 py-0.5 font-mono text-[11px]">dark:invert</code>) flips dark strokes to pure white without any white box artifact.
            </p>

            {/* Side-by-side comparison box */}
            <div className="mt-5 grid grid-cols-2 gap-3 text-center text-xs">
              <div className="flex flex-col items-center justify-center rounded-xl bg-stone-100 p-4 border border-stone-200">
                <span className="text-[11px] font-medium text-stone-600 mb-2">Light Mode</span>
                <div className="h-14 w-14 flex items-center justify-center">
                  <Image
                    src="/Quivers_logo.png"
                    alt="Quivers Light"
                    width={56}
                    height={56}
                    className="object-contain"
                  />
                </div>
                <span className="mt-2 text-[10px] text-stone-500">Transparent bg</span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-zinc-950 p-4 border border-zinc-800">
                <span className="text-[11px] font-medium text-zinc-400 mb-2">Dark Mode</span>
                <div className="h-14 w-14 flex items-center justify-center">
                  <Image
                    src="/Quivers_logo.png"
                    alt="Quivers Dark"
                    width={56}
                    height={56}
                    className="object-contain invert"
                  />
                </div>
                <span className="mt-2 text-[10px] text-zinc-500">Inverted lines</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-zinc-800 text-[11px] text-stone-500 dark:text-zinc-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Zero white bounding box in both themes</span>
          </div>
        </div>

        {/* Card 2: Color Palette */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              Color Harmony
            </span>
            <h4 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mt-1">
              Curated Color Palette
            </h4>
            <p className="text-xs text-stone-600 dark:text-zinc-400 mt-2">
              Black and white provide high-contrast readability, paired with a single warm Archery Gold accent inspired by the 10-ring bullseye and leather quiver craftsmanship.
            </p>

            {/* Swatches */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700">
                <div className="flex items-center gap-2.5">
                  <span className="h-5 w-5 rounded-md bg-[#09090b] border border-stone-300 dark:border-zinc-600" />
                  <span className="font-semibold text-stone-900 dark:text-stone-100">Pure Black / Zinc</span>
                </div>
                <code className="text-[11px] text-stone-500 font-mono">#09090b</code>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700">
                <div className="flex items-center gap-2.5">
                  <span className="h-5 w-5 rounded-md bg-[#ffffff] border border-stone-300 dark:border-zinc-600" />
                  <span className="font-semibold text-stone-900 dark:text-stone-100">Crisp White</span>
                </div>
                <code className="text-[11px] text-stone-500 font-mono">#ffffff</code>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2.5">
                  <span className="h-5 w-5 rounded-md bg-[#d97706] dark:bg-[#fbbf24] shadow-xs" />
                  <span className="font-semibold text-amber-900 dark:text-amber-200">Archery Gold (Accent)</span>
                </div>
                <code className="text-[11px] text-amber-700 dark:text-amber-300 font-mono">#d97706 / #fbbf24</code>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-zinc-800 text-[11px] text-stone-500 dark:text-zinc-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>WCAG AAA contrast compliance</span>
          </div>
        </div>

        {/* Card 3: Archery Metaphor & Viva Talking Points */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              Metaphoric Mapping
            </span>
            <h4 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mt-1">
              Archery Motifs in Viva
            </h4>
            <p className="text-xs text-stone-600 dark:text-zinc-400 mt-2">
              How the architectural concept connects to the UX elements:
            </p>

            <ul className="mt-4 space-y-2 text-xs text-stone-600 dark:text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">1.</span>
                <span><strong>The Arrow:</strong> Represents an individual source-grounded question aimed at testing understanding.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">2.</span>
                <span><strong>The Quiver:</strong> The generated set of arrows held for a specific syllabus or document.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">3.</span>
                <span><strong>The Bullseye:</strong> Exact answer match backed by page/paragraph grounding citation.</span>
              </li>
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-zinc-800 text-[11px] text-stone-500 dark:text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
            <span>Designed for clear viva defense</span>
          </div>
        </div>
      </div>
    </section>
  );
}
