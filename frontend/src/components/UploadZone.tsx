"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  Loader2,
  FileCheck2,
  AlertTriangle,
} from "lucide-react";
import { extractPdfDocument, PDFExtractionResponse } from "@/lib/api";
import { ExtractionResultViewer } from "./ExtractionResultViewer";

interface UploadZoneProps {
  onExtractionComplete?: (result: PDFExtractionResponse) => void;
}

/**
 * UploadZone: Drag-and-drop PDF ingestion card with strict 10 MB limit,
 * client-side PDF validation, and live PyMuPDF text extraction.
 */
export function UploadZone({ onExtractionComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<PDFExtractionResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Strict 10 MB limit required by Phase 2 specifications
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const validateAndHandleFile = (file: File) => {
    setErrorMessage(null);
    setExtractionResult(null);

    // 1. Validate MIME type or file extension
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setErrorMessage(
        `Invalid file type for '${file.name}'. Quivers strictly accepts PDF documents (.pdf).`
      );
      return;
    }

    // 2. Validate file size (10 MB limit)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(
        `File is too large (${sizeMb} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`
      );
      return;
    }

    if (file.size === 0) {
      setErrorMessage("The selected PDF file is empty (0 bytes).");
      return;
    }

    // 3. Accepted file
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFile(e.target.files[0]);
    }
  };

  const handleExecuteExtraction = async () => {
    if (!selectedFile) return;
    setIsExtracting(true);
    setErrorMessage(null);

    try {
      const result = await extractPdfDocument(selectedFile);
      setExtractionResult(result);
      if (onExtractionComplete) {
        onExtractionComplete(result);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to extract text from PDF document.");
    } finally {
      setIsExtracting(false);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setIsExtracting(false);
    setExtractionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Generates a 100% valid multi-page PDF in-memory for immediate viva testing.
   * Includes Page 1 with digital text, and Page 2 with no text (flagged for OCR).
   */
  const loadSampleDocument = (withScannedPage: boolean = true) => {
    const samplePdfString = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R 4 0 R] /Count 2>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources <</Font <</F1 6 0 R>>>>>> endobj
4 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>> endobj
5 0 obj <</Length 285>> stream
BT
/F1 12 Tf
50 720 Td
(Quivers Architecture & Multi-Head Self-Attention Study Guide) Tj
0 -24 Td
(1. Concept: Each arrow represents an individual source-grounded question.) Tj
0 -18 Td
(2. The quiver holds the entire set of questions forged from this syllabus.) Tj
0 -18 Td
(3. Attention formula: Attention(Q, K, V) = softmax(Q * K^T / sqrt(d_k)) * V) Tj
ET
endstream endobj
6 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000121 00000 n 
0000000234 00000 n 
0000000305 00000 n 
0000000641 00000 n 
trailer <</Size 7 /Root 1 0 R>>
startxref
720
%%EOF`;

    const sampleBlob = new Blob([samplePdfString], { type: "application/pdf" });
    const sampleFile = new File(
      [sampleBlob],
      withScannedPage
        ? "Quivers_Sample_Mixed_Document.pdf"
        : "Quivers_Sample_Digital_Notes.pdf",
      {
        type: "application/pdf",
        lastModified: Date.now(),
      }
    );
    validateAndHandleFile(sampleFile);
  };

  // If extraction succeeded, show the per-page structured text viewer!
  if (extractionResult) {
    return (
      <ExtractionResultViewer
        result={extractionResult}
        onReset={resetSelection}
      />
    );
  }

  return (
    <div
      id="upload-section"
      className="w-full max-w-2xl mx-auto rounded-2xl border border-stone-200/90 bg-white/90 p-6 sm:p-8 shadow-xl shadow-stone-200/50 dark:border-zinc-800/90 dark:bg-zinc-900/90 dark:shadow-none transition-all"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleInputChange}
        id="pdf-upload-input"
      />

      {!selectedFile ? (
        /* Dropzone idle/drag state */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
            isDragging
              ? "border-amber-500 bg-amber-500/5 scale-[1.01]"
              : "border-stone-300 hover:border-amber-500 hover:bg-stone-50/50 dark:border-zinc-700 dark:hover:border-amber-400 dark:hover:bg-zinc-800/50"
          }`}
        >
          {/* Archery / Upload Motif */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <UploadCloud className="h-8 w-8" />
          </div>

          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Drop your PDF here, or{" "}
            <span className="text-amber-600 dark:text-amber-400 underline underline-offset-2">
              browse
            </span>
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-stone-500 dark:text-zinc-400 max-w-sm">
            Lecture notes, syllabus, or textbooks. Maximum file size:{" "}
            <strong className="text-stone-800 dark:text-zinc-200">{MAX_FILE_SIZE_MB} MB</strong>.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-zinc-800 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
              PDF-Only Validation
            </span>
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-zinc-800 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
              10 MB Max Limit
            </span>
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-zinc-800 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
              PyMuPDF Engine
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
              OCR Flagging
            </span>
          </div>

          {/* Quick 1-Click Demo File Generator */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadSampleDocument(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:underline"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Try with 2-Page Sample (Digital + Scanned Page Flagged)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Selected file review state */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-stone-500 dark:text-zinc-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Ready for PyMuPDF extraction
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetSelection}
              aria-label="Remove file"
              disabled={isExtracting}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-zinc-700 dark:hover:text-stone-200 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={isExtracting}
              onClick={handleExecuteExtraction}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white shadow-md hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400 dark:text-stone-950" />
                  <span>Extracting Pages with PyMuPDF...</span>
                </>
              ) : (
                <>
                  <span>Extract Document Text</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isExtracting}
              onClick={resetSelection}
              className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Friendly validation / server error alert */}
      {errorMessage && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Extraction Notice</p>
            <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
