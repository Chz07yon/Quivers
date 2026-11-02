"use client";

import React, { useState } from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { PDFExtractionResponse, PageExtraction } from "@/lib/api";

interface ExtractionResultViewerProps {
  result: PDFExtractionResponse;
  onReset: () => void;
}

export function ExtractionResultViewer({
  result,
  onReset,
}: ExtractionResultViewerProps) {
  const [expandedPages, setExpandedPages] = useState<Record<number, boolean>>({
    1: true, // expand page 1 by default
  });
  const [copiedPageIndex, setCopiedPageIndex] = useState<number | null>(null);
  const [showJsonRaw, setShowJsonRaw] = useState(false);

  const togglePage = (pageNum: number) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageNum]: !prev[pageNum],
    }));
  };

  const copyPageText = (pageNum: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPageIndex(pageNum);
    setTimeout(() => setCopiedPageIndex(null), 2000);
  };

  const { summary, pages } = result;

  return (
    <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 transition-all">
      {/* Header & Metrics Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-100 dark:border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              PyMuPDF Extraction Complete
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-500" />
            <span className="truncate max-w-md">{summary.filename}</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
            {summary.file_size_formatted} • {summary.total_pages} Page(s) Processed
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowJsonRaw(!showJsonRaw)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all"
            title="Inspect raw JSON output for Viva demonstration"
          >
            <Code2 className="h-4 w-4" />
            <span>{showJsonRaw ? "Hide JSON" : "Inspect JSON"}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 transition-all"
          >
            <span>Upload Another PDF</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl bg-stone-50 p-3.5 dark:bg-zinc-800/60 border border-stone-100 dark:border-zinc-800">
          <span className="text-[11px] text-stone-500 dark:text-zinc-400 block">Total Pages</span>
          <span className="font-bold text-stone-900 dark:text-stone-100 text-lg">
            {summary.total_pages}
          </span>
        </div>

        <div className="rounded-xl bg-stone-50 p-3.5 dark:bg-zinc-800/60 border border-stone-100 dark:border-zinc-800">
          <span className="text-[11px] text-stone-500 dark:text-zinc-400 block">Total Words</span>
          <span className="font-bold text-stone-900 dark:text-stone-100 text-lg">
            {summary.total_words.toLocaleString()}
          </span>
        </div>

        <div className="rounded-xl bg-stone-50 p-3.5 dark:bg-zinc-800/60 border border-stone-100 dark:border-zinc-800">
          <span className="text-[11px] text-stone-500 dark:text-zinc-400 block">Digital Text Pages</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            {summary.selectable_pages_count}
          </span>
        </div>

        <div className="rounded-xl bg-stone-50 p-3.5 dark:bg-zinc-800/60 border border-stone-100 dark:border-zinc-800">
          <span className="text-[11px] text-stone-500 dark:text-zinc-400 block">Flagged for OCR</span>
          <span
            className={`font-bold text-lg flex items-center gap-1 ${
              summary.scanned_pages_count > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-stone-500 dark:text-zinc-400"
            }`}
          >
            {summary.scanned_pages_count > 0 && <AlertTriangle className="h-4 w-4" />}
            {summary.scanned_pages_count}
          </span>
        </div>
      </div>

      {/* Raw JSON View (if toggled) */}
      {showJsonRaw && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-stone-950 p-4 text-xs font-mono text-stone-100 dark:border-zinc-800 overflow-x-auto max-h-80">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {/* Per-Page Structured Text Accordion */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-2">
          Structured Per-Page Output
        </h4>

        {pages.map((page: PageExtraction) => {
          const isExpanded = !!expandedPages[page.page_number];
          const isCopied = copiedPageIndex === page.page_number;

          return (
            <div
              key={page.page_number}
              className={`rounded-xl border transition-all ${
                page.is_flagged_for_ocr
                  ? "border-amber-400/60 bg-amber-500/5 dark:border-amber-500/40"
                  : "border-stone-200 bg-stone-50/50 dark:border-zinc-800 dark:bg-zinc-850"
              }`}
            >
              {/* Accordion header */}
              <div
                onClick={() => togglePage(page.page_number)}
                className="flex cursor-pointer items-center justify-between p-4 select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-xs font-bold text-white dark:bg-amber-500 dark:text-stone-950">
                    P{page.page_number}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                        Page {page.page_number}
                      </span>
                      {page.is_flagged_for_ocr ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="h-3 w-3" />
                          <span>No Selectable Text (OCR Candidate)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Digital Text</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-500 dark:text-zinc-400">
                      {page.word_count} words • {page.character_count} characters
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {page.has_selectable_text && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyPageText(page.page_number, page.text);
                      }}
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-zinc-700 dark:hover:text-stone-200 transition-colors"
                      title="Copy page text"
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-stone-400" />
                  )}
                </div>
              </div>

              {/* Accordion body */}
              {isExpanded && (
                <div className="border-t border-stone-200/70 p-4 pt-3 dark:border-zinc-800">
                  {page.is_flagged_for_ocr ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <p className="font-semibold">
                            Flagged for Phase 8 OCR Extraction
                          </p>
                          <p className="mt-0.5 text-stone-600 dark:text-zinc-300">
                            {page.flag_reason ||
                              "No selectable digital font streams were found on this page. This page contains scanned bitmap graphics or non-searchable raster images."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white p-3.5 dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800 text-xs sm:text-sm text-stone-800 dark:text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto">
                      {page.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next Step Teaser (Phase 3: Claude Quiz Generation) */}
      <div className="mt-6 pt-5 border-t border-stone-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-600 dark:text-zinc-400">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Extracted text is structured and ready for Claude prompt chunking.</span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline"
        >
          <span>Upload Another Document</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
