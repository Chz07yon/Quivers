"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, ArrowRight, X } from "lucide-react";

interface UploadZoneProps {
  onFileSelect?: (file: File) => void;
}

/**
 * UploadZone: Drag-and-drop PDF ingestion card with strict client-side validation,
 * error handling, and animated state transitions.
 */
export function UploadZone({ onFileSelect }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE_MB = 25;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const validateAndHandleFile = (file: File) => {
    setErrorMessage(null);
    setUploadSuccess(false);

    // 1. Validate MIME type or file extension
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setErrorMessage(
        "Invalid file format. Quivers strictly processes PDF documents (.pdf). Please select a PDF file."
      );
      return;
    }

    // 2. Validate file size (25MB limit)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(
        `File is too large (${sizeMb} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`
      );
      return;
    }

    // 3. Accepted file
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
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

  const handleSimulateQuizGeneration = () => {
    if (!selectedFile) return;
    setIsSimulatingUpload(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSimulatingUpload(false);
          setUploadSuccess(true);
          return 100;
        }
        return prev + 18;
      });
    }, 200);
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setUploadProgress(0);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const loadSampleDocument = () => {
    // Generate a mock sample PDF File object for instant testing
    const sampleBlob = new Blob(
      [
        "%PDF-1.4 Mock document: Introduction to Transformer Models & Attention Mechanisms. Contains 15 pages of syllabus content.",
      ],
      { type: "application/pdf" }
    );
    const sampleFile = new File(
      [sampleBlob],
      "Attention_Mechanisms_Study_Guide.pdf",
      {
        type: "application/pdf",
        lastModified: Date.now(),
      }
    );
    validateAndHandleFile(sampleFile);
  };

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
          {/* Pulsing Archery/Upload Motif */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <UploadCloud className="h-8 w-8" />
          </div>

          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Drop your PDF here, or <span className="text-amber-600 dark:text-amber-400 underline underline-offset-2">browse</span>
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-stone-500 dark:text-zinc-400 max-w-sm">
            Lecture slides, textbooks, or research papers. Maximum file size: {MAX_FILE_SIZE_MB}MB.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-zinc-800 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
              PDF Only
            </span>
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-zinc-800 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
              PyMuPDF + OCR Engine
            </span>
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-zinc-800 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700">
              Grounding Citations
            </span>
          </div>

          {/* Quick Demo File Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              loadSampleDocument();
            }}
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Or try with sample study guide</span>
          </button>
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
                  {(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetSelection}
              aria-label="Remove file"
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-zinc-700 dark:hover:text-stone-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Simulated Extraction Progress Bar */}
          {isSimulatingUpload && (
            <div className="flex flex-col gap-1.5 py-2">
              <div className="flex justify-between text-xs font-medium text-stone-600 dark:text-zinc-400">
                <span>Forging Arrows (Extracting & Chunking PDF)...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
                <div
                  className="h-full bg-amber-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Document successfully ingested. 10 source-grounded questions ready in your Quiver!
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={isSimulatingUpload}
              onClick={handleSimulateQuizGeneration}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white shadow-md hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 transition-all disabled:opacity-50"
            >
              <span>{isSimulatingUpload ? "Processing..." : "Generate Quiver Quiz"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={resetSelection}
              className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Friendly validation error notice */}
      {errorMessage && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <p className="flex-1">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
