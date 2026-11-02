"use client";

import React from "react";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { UploadZone } from "@/components/UploadZone";
import { ArrowProgressBar } from "@/components/ArrowProgressBar";
import { BullseyeFeedback } from "@/components/BullseyeFeedback";
import { MyQuiverPreview } from "@/components/MyQuiverPreview";
import { BackendHealthCard } from "@/components/BackendHealthCard";
import { DesignSystemShowcase } from "@/components/DesignSystemShowcase";
import {
  FileText,
  Target,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  Layers,
  ChevronDown,
} from "lucide-react";

export default function Home() {
  const scrollToUpload = () => {
    document.getElementById("upload-section")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors">
      {/* Sticky Navbar */}
      <Navbar onUploadClick={scrollToUpload} />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
          {/* Subtle Archery Background Grid & Ambient Glow */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 h-64 w-96 rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-400/5 pointer-events-none" />

          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Concept Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 mb-6 backdrop-blur-xs">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Each arrow is a question. The quiver holds your set.</span>
            </div>

            {/* Central Hero Headline & Tagline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-stone-950 dark:text-white leading-[1.1]">
              Turn any PDF into a{" "}
              <span className="relative inline-block text-amber-600 dark:text-amber-400">
                quiz
                <svg
                  className="absolute -bottom-2 left-0 w-full text-amber-500/60 dark:text-amber-400/70"
                  height="8"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 6 C 30 1, 70 1, 100 6"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
              </span>
            </h1>

            {/* Tagline elaboration */}
            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-stone-600 dark:text-zinc-400 leading-relaxed">
              Upload your lecture notes, textbooks, or research papers. Quivers extracts
              the core concepts with PyMuPDF, invokes Claude to forge rigorous multiple-choice
              questions, and grounds every answer with direct source citations.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={scrollToUpload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-stone-950/20 hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 dark:shadow-amber-500/20 transition-all cursor-pointer"
              >
                <span>Upload PDF & Forge Quiver</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white/80 px-6 py-3.5 text-sm font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-950 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition-all"
              >
                <span>Explore Archery Motifs</span>
                <ChevronDown className="h-4 w-4" />
              </a>
            </div>

            {/* Upload Call-To-Action Dropzone */}
            <div className="mt-14">
              <UploadZone />
            </div>
          </div>
        </section>

        {/* ARCHERY MOTIF SHOWCASE SECTION */}
        <section className="border-y border-stone-200 bg-stone-100/60 py-16 dark:border-zinc-800/80 dark:bg-zinc-900/40 transition-colors">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                <Target className="h-4 w-4" />
                <span>Design System & Interactive Motifs</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                The Archery Visual Language
              </h2>
              <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">
                Light, intentional metaphors woven into the learning flow without clutter.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* 1. Arrow Progress Bar Motif */}
              <div className="flex flex-col gap-4">
                <ArrowProgressBar totalQuestions={5} initialQuestion={2} />
                <div className="rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  <strong className="text-stone-900 dark:text-stone-100">Arrow Progress Bar:</strong> Each quiz step is represented as an arrow in flight. Completed questions show verified checkmarks; the active arrow pulses with the amber accent.
                </div>
              </div>

              {/* 2. Bullseye Correct Answer Feedback */}
              <div className="flex flex-col gap-4">
                <BullseyeFeedback />
                <div className="rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  <strong className="text-stone-900 dark:text-stone-100">Bullseye Feedback:</strong> Correct responses trigger the target bullseye badge accompanied by verified document citations (page & paragraph grounding).
                </div>
              </div>
            </div>

            {/* 3. My Quiver Saved Quizzes Showcase */}
            <div className="mt-14 pt-10 border-t border-stone-200 dark:border-zinc-800">
              <MyQuiverPreview />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS / ARCHITECTURE PIPELINE */}
        <section id="how-it-works" className="py-20 scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Pipeline & Architecture
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50 mt-1">
                From PDF Document to Source-Grounded Quiver
              </h2>
              <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">
                Designed for rigor, speed, and 100% source-grounded answers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 mb-5 border border-amber-500/20">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Step 1 • Document Extraction
                </div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1">
                  PyMuPDF + Tesseract OCR
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-stone-600 dark:text-zinc-400 leading-relaxed">
                  Fast native digital text parsing via PyMuPDF. If scanned or non-searchable pages are encountered, an automatic Tesseract OCR fallback extracts every character cleanly.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 mb-5 border border-amber-500/20">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Step 2 • LLM Generation
                </div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1">
                  Anthropic Claude API
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-stone-600 dark:text-zinc-400 leading-relaxed">
                  The backend invokes Claude to formulate high-discrimination questions. Every single question links directly to a specific source passage to prevent hallucinations.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 mb-5 border border-amber-500/20">
                  <Target className="h-6 w-6" />
                </div>
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Step 3 • The Quiver Arena
                </div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1">
                  Arrow Progression & Analytics
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-stone-600 dark:text-zinc-400 leading-relaxed">
                  Release arrows one-by-one with immediate bullseye feedback, attempt history tracked in Supabase Postgres, and actionable knowledge gap summaries.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PHASE 1: BACKEND HEALTH & CORS BRIDGE */}
        <section className="border-t border-stone-200 bg-white py-14 dark:border-zinc-800 dark:bg-zinc-950 transition-colors">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Phase 1 Verification
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50 mt-0.5">
                Full-Stack Connection & Diagnostics
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-stone-500 dark:text-zinc-400">
                Live verification that the Next.js frontend is communicating with the FastAPI backend through CORS.
              </p>
            </div>
            <BackendHealthCard />
          </div>
        </section>

        {/* DESIGN SYSTEM & VIVA DEFENSE GUIDE */}
        <section className="border-t border-stone-200 bg-stone-100/40 py-20 dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <DesignSystemShowcase />
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-stone-200 bg-white py-10 dark:border-zinc-800 dark:bg-zinc-950 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800">
              <Image
                src="/Quivers_logo.png"
                alt="Quivers Logo"
                width={26}
                height={26}
                className="object-contain dark:invert"
              />
            </div>
            <span className="font-bold text-sm tracking-tight text-stone-900 dark:text-white">
              Quivers
            </span>
            <span className="text-xs text-stone-400 dark:text-zinc-500">
              • Turn any PDF into a quiz
            </span>
          </div>

          <div className="text-xs text-stone-500 dark:text-zinc-400 text-center sm:text-right">
            <span>Built with Next.js App Router, Tailwind CSS, FastAPI, PyMuPDF & Claude</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
