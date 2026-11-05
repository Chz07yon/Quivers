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
  Target,
  Search,
  BookOpen,
  Split,
} from "lucide-react";
import { PDFExtractionResponse, PageExtraction, TextChunk } from "@/lib/api";
import { QuestionGeneratorPanel } from "./QuestionGeneratorPanel";

interface ExtractionResultViewerProps {
  result: PDFExtractionResponse;
  onReset: () => void;
}

export function ExtractionResultViewer({
  result,
  onReset,
}: ExtractionResultViewerProps) {
  const [activeTab, setActiveTab] = useState<"chunks" | "pages">("chunks");
  const [expandedPages, setExpandedPages] = useState<Record<number, boolean>>({
    1: true,
  });
  const [expandedChunks, setExpandedChunks] = useState<Record<number, boolean>>({
    1: true, // first chunk expanded by default
  });
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [showJsonRaw, setShowJsonRaw] = useState(false);
  const [chunkSearch, setChunkSearch] = useState("");

  const { summary, pages, chunks = [], total_chunks = chunks.length } = result;

  const togglePage = (pageNum: number) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageNum]: !prev[pageNum],
    }));
  };

  const toggleChunk = (chunkIndex: number) => {
    setExpandedChunks((prev) => ({
      ...prev,
      [chunkIndex]: !prev[chunkIndex],
    }));
  };

  const expandAllChunks = () => {
    const all: Record<number, boolean> = {};
    chunks.forEach((c) => {
      all[c.chunk_index] = true;
    });
    setExpandedChunks(all);
  };

  const collapseAllChunks = () => {
    setExpandedChunks({});
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Filter chunks by search term
  const filteredChunks = chunks.filter((c) => {
    if (!chunkSearch) return true;
    const term = chunkSearch.toLowerCase();
    return (
      (c.heading && c.heading.toLowerCase().includes(term)) ||
      c.content.toLowerCase().includes(term) ||
      c.page_range.toLowerCase().includes(term)
    );
  });

  const avgChunkWords =
    chunks.length > 0
      ? Math.round(chunks.reduce((sum, c) => sum + c.word_count, 0) / chunks.length)
      : 0;

  const chunkStrategy = summary.chunk_strategy || (chunks[0]?.chunk_strategy ?? "heading");

  return (
    <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 transition-all">
      {/* Header & Metrics Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-100 dark:border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              Extraction & Smart Chunking Complete
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-500" />
            <span className="truncate max-w-md">{summary.filename}</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
            {summary.file_size_formatted} • {summary.total_pages} Page(s) • {total_chunks} Smart Chunks
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowJsonRaw(!showJsonRaw)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all cursor-pointer"
            title="Inspect raw JSON output for Viva demonstration"
          >
            <Code2 className="h-4 w-4" />
            <span>{showJsonRaw ? "Hide JSON" : "Inspect JSON"}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 transition-all cursor-pointer"
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

        <div className="rounded-xl bg-amber-500/10 p-3.5 dark:bg-amber-500/15 border border-amber-500/20">
          <span className="text-[11px] text-amber-700 dark:text-amber-300 block font-semibold">
            Smart Chunks Created
          </span>
          <span className="font-bold text-amber-600 dark:text-amber-400 text-lg flex items-center gap-1">
            <Split className="h-4 w-4" />
            {total_chunks}
          </span>
        </div>

        <div className="rounded-xl bg-stone-50 p-3.5 dark:bg-zinc-800/60 border border-stone-100 dark:border-zinc-800">
          <span className="text-[11px] text-stone-500 dark:text-zinc-400 block">Chunking Strategy</span>
          <span className="font-bold text-stone-900 dark:text-stone-100 text-sm capitalize flex items-center gap-1 mt-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            {chunkStrategy === "heading" ? "Heading Boundaries" : "Page Groups Fallback"}
          </span>
        </div>
      </div>

      {summary.ocr_pages_processed && summary.ocr_pages_processed > 0 ? (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-bold">Phase 8 OCR Active: </span>
            <span>
              Successfully recovered {summary.ocr_pages_processed} scanned page(s) using{" "}
              {summary.ocr_engine || "Tesseract OCR engine"} and merged into the quiz pipeline.
            </span>
          </div>
        </div>
      ) : null}

      {/* Raw JSON View (if toggled) */}
      {showJsonRaw && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-stone-950 p-4 text-xs font-mono text-stone-100 dark:border-zinc-800 overflow-x-auto max-h-80">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {/* TAB SELECTOR: Smart Chunks (Debug View) vs Raw Pages */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("chunks")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "chunks"
                ? "bg-amber-500 text-stone-950 shadow-xs dark:bg-amber-400"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            <Split className="h-4 w-4" />
            <span>Smart Chunks (Debug View)</span>
            <span className="rounded-full bg-stone-950/15 px-1.5 py-0.2 text-[10px] font-semibold dark:bg-stone-950/20">
              {total_chunks}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pages")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "pages"
                ? "bg-amber-500 text-stone-950 shadow-xs dark:bg-amber-400"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Per-Page Extraction</span>
            <span className="rounded-full bg-stone-950/15 px-1.5 py-0.2 text-[10px] font-semibold dark:bg-stone-950/20">
              {pages.length}
            </span>
          </button>
        </div>

        {activeTab === "chunks" && (
          <div className="flex items-center gap-2">
            {/* Quick search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 dark:text-zinc-500" />
              <input
                type="text"
                value={chunkSearch}
                onChange={(e) => setChunkSearch(e.target.value)}
                placeholder="Search chunks or page..."
                className="w-44 sm:w-56 rounded-lg border border-stone-200 bg-stone-50 pl-8 pr-2.5 py-1 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-stone-100 dark:placeholder:text-zinc-500"
              />
            </div>

            <button
              type="button"
              onClick={expandAllChunks}
              className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-stone-300 dark:text-zinc-700">•</span>
            <button
              type="button"
              onClick={collapseAllChunks}
              className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
            >
              Collapse
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: SMART CHUNKS DEBUG VIEW (PHASE 3) */}
      {activeTab === "chunks" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-500 dark:text-zinc-400 pb-1">
            <span>
              Showing {filteredChunks.length} of {chunks.length} smart chunks • Average size: {avgChunkWords} words
            </span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Every chunk maintains source page citations for 100% grounded question generation.
            </span>
          </div>

          {filteredChunks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-500 dark:border-zinc-800 dark:text-zinc-400">
              No chunks match &quot;{chunkSearch}&quot;.
            </div>
          ) : (
            filteredChunks.map((chunk: TextChunk) => {
              const isExpanded = !!expandedChunks[chunk.chunk_index];
              const isCopied = copiedIndex === `chunk-${chunk.chunk_index}`;

              return (
                <div
                  key={chunk.chunk_index}
                  className="rounded-xl border border-stone-200 bg-stone-50/40 dark:border-zinc-800 dark:bg-zinc-850 transition-all hover:border-amber-500/40"
                >
                  {/* Chunk Header */}
                  <div
                    onClick={() => toggleChunk(chunk.chunk_index)}
                    className="flex cursor-pointer items-center justify-between p-4 select-none"
                  >
                    <div className="flex items-center gap-3">
                      {/* Arrow / Chunk Number Badge */}
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30">
                        #{chunk.chunk_index}
                      </span>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Heading Title */}
                          <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                            {chunk.heading || `Chunk ${chunk.chunk_index}`}
                          </span>

                          {/* EXACT PAGE RANGE BADGE */}
                          <span className="inline-flex items-center gap-1 rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-white dark:text-stone-950">
                            <BookOpen className="h-3 w-3 text-amber-400 dark:text-amber-600" />
                            <span>{chunk.page_range}</span>
                          </span>

                          {/* Strategy Tag */}
                          <span className="rounded-md bg-stone-200/80 px-1.5 py-0.2 text-[10px] font-medium text-stone-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {chunk.chunk_strategy === "heading" ? "Heading Boundary" : "Page Group"}
                          </span>
                        </div>

                        <span className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5 block">
                          {chunk.word_count} words • {chunk.character_count} chars • Pages {chunk.start_page} to {chunk.end_page}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyText(`chunk-${chunk.chunk_index}`, chunk.content);
                        }}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-zinc-700 dark:hover:text-stone-200 transition-colors"
                        title="Copy chunk text"
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>

                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-stone-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-stone-400" />
                      )}
                    </div>
                  </div>

                  {/* Chunk Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-stone-200/70 p-4 pt-3 dark:border-zinc-800 space-y-3">
                      {/* Viva Source Citation Grounding Preview */}
                      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-800 dark:text-amber-300 border border-amber-500/20">
                        <Target className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                          <strong>Citation Anchor:</strong> Questions forged from this chunk will cite{" "}
                          <code className="font-mono font-semibold">{chunk.page_range}</code> (
                          {chunk.heading})
                        </span>
                      </div>

                      {/* Content Box */}
                      <div className="rounded-lg bg-white p-3.5 dark:bg-zinc-900 border border-stone-200/80 dark:border-zinc-800 text-xs sm:text-sm text-stone-800 dark:text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto">
                        {chunk.content}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: PER-PAGE RAW TEXT */}
      {activeTab === "pages" && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-2">
            Structured Per-Page Output
          </h4>

          {pages.map((page: PageExtraction) => {
            const isExpanded = !!expandedPages[page.page_number];
            const isCopied = copiedIndex === `page-${page.page_number}`;

            return (
              <div
                key={page.page_number}
                className={`rounded-xl border transition-all ${
                  page.is_flagged_for_ocr
                    ? "border-amber-400/60 bg-amber-500/5 dark:border-amber-500/40"
                    : "border-stone-200 bg-stone-50/50 dark:border-zinc-800 dark:bg-zinc-850"
                }`}
              >
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
                        {page.ocr_applied ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/40">
                            <Sparkles className="h-3 w-3" />
                            <span>Recovered via OCR ({page.ocr_method || "Tesseract"})</span>
                          </span>
                        ) : page.is_flagged_for_ocr ? (
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
                          copyText(`page-${page.page_number}`, page.text);
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
      )}

      {/* PHASE 4: QUESTION GENERATOR & ARROW FORGE */}
      {chunks && chunks.length > 0 && (
        <QuestionGeneratorPanel
          chunks={chunks}
          documentName={summary.filename}
        />
      )}

      {/* Footer / Reset Controls */}
      <div className="mt-8 pt-5 border-t border-stone-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-600 dark:text-zinc-400">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>
            {total_chunks} smart chunk(s) ready with page range citations for Claude arrow formulation.
          </span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
        >
          <span>Upload Another Document</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
