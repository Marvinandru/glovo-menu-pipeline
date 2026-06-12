"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import DropZone from "./components/DropZone";
import JobProgress from "./components/JobProgress";
import DownloadPanel from "./components/DownloadPanel";
import ExtractedTable from "./components/ExtractedTable";
import JobHistory from "./components/JobHistory";
import {
  Sparkles,
  FileDown,
  Zap,
  ChefHat,
  ArrowRight,
} from "lucide-react";

interface MenuItem {
  item_name: string;
  description: string;
  price: string;
  category: string;
}

interface JobState {
  jobId: string | null;
  status: string;
  progress: number;
  totalItems: number;
  itemsDone: number;
  errorMessage: string | null;
  excelUrl: string | null;
  zipUrl: string | null;
  imagesGenerated: number;
  items: MenuItem[];
}

const INITIAL_STATE: JobState = {
  jobId: null,
  status: "idle",
  progress: 0,
  totalItems: 0,
  itemsDone: 0,
  errorMessage: null,
  excelUrl: null,
  zipUrl: null,
  imagesGenerated: 0,
  items: [],
};

export default function Home() {
  const [job, setJob] = useState<JobState>(INITIAL_STATE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Poll job status
  const startPolling = useCallback((jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/job-status/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();

        setJob((prev) => ({
          ...prev,
          status: data.status,
          progress: data.progress,
          totalItems: data.total_items,
          itemsDone: data.items_done,
          errorMessage: data.error_message,
          excelUrl: data.excel_url,
          zipUrl: data.zip_url,
          items: data.extracted_json || prev.items,
        }));

        if (data.status === "completed" || data.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsProcessing(false);
          setHistoryRefresh((prev) => prev + 1);
        }
      } catch {
        // Polling error, will retry next interval
      }
    }, 2000);
  }, []);

  // Handle file submission
  const handleFileAccepted = async (file: File) => {
    setIsProcessing(true);
    setJob({ ...INITIAL_STATE, status: "pending", progress: 2 });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/process-menu", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setJob((prev) => ({
          ...prev,
          status: "failed",
          errorMessage: data.error || "Processing failed",
          jobId: data.jobId || null,
        }));
        setIsProcessing(false);
        return;
      }

      // If the response came back immediately (completed synchronously)
      if (data.status === "completed") {
        setJob({
          jobId: data.jobId,
          status: "completed",
          progress: 100,
          totalItems: data.totalItems,
          itemsDone: data.totalItems,
          errorMessage: null,
          excelUrl: data.excelUrl,
          zipUrl: data.zipUrl,
          imagesGenerated: data.imagesGenerated,
          items: data.items || [],
        });
        setIsProcessing(false);
        setHistoryRefresh((prev) => prev + 1);
      } else if (data.jobId) {
        // Async processing — start polling
        setJob((prev) => ({ ...prev, jobId: data.jobId }));
        startPolling(data.jobId);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setJob((prev) => ({
        ...prev,
        status: "failed",
        errorMessage: "Network error. Please check your connection and try again.",
      }));
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setJob(INITIAL_STATE);
    setIsProcessing(false);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  const isIdle = job.status === "idle";
  const isActive =
    job.status !== "idle" && job.status !== "completed" && job.status !== "failed";
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";

  return (
    <div className="min-h-screen bg-grid">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl glovo-gradient flex items-center justify-center shadow-lg">
              <ChefHat className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-100">
                Menu Studio
              </h1>
              <p className="text-[11px] text-zinc-500 -mt-0.5 uppercase tracking-widest">
                Glovo Internal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/template"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-300 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Template
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* ── Hero section (only when idle) ──────────────────────── */}
        {isIdle && (
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              Powered by Gemini AI
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-100 mb-4">
              Menu to Store Wall
              <br />
              <span className="bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">
                in one click
              </span>
            </h2>
            <p className="text-zinc-500 max-w-lg mx-auto text-lg">
              Upload a menu photo or PDF. Get an Excel spreadsheet and
              AI-generated food images ready for Glovo.
            </p>

            {/* Process Steps */}
            <div className="flex items-center justify-center gap-2 mt-8 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 rounded-lg border border-zinc-700">
                <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                Upload
              </span>
              <ArrowRight className="w-4 h-4 text-zinc-700" />
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 rounded-lg border border-zinc-700">
                <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                Extract
              </span>
              <ArrowRight className="w-4 h-4 text-zinc-700" />
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 rounded-lg border border-zinc-700">
                <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                Generate
              </span>
              <ArrowRight className="w-4 h-4 text-zinc-700" />
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 rounded-lg border border-zinc-700">
                <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                  4
                </span>
                Download
              </span>
            </div>
          </div>
        )}

        {/* ── Main content grid ─────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left column: Upload + Results */}
          <div className="space-y-6">
            {/* Upload zone */}
            <DropZone
              onFileAccepted={handleFileAccepted}
              disabled={isProcessing}
            />

            {/* Progress indicator */}
            {isActive && (
              <JobProgress
                status={job.status}
                progress={job.progress}
                totalItems={job.totalItems}
                itemsDone={job.itemsDone}
                errorMessage={job.errorMessage}
              />
            )}

            {/* Failed state */}
            {isFailed && (
              <div className="space-y-4">
                <JobProgress
                  status="failed"
                  progress={job.progress}
                  totalItems={job.totalItems}
                  itemsDone={job.itemsDone}
                  errorMessage={job.errorMessage}
                />
                <button
                  onClick={handleReset}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors border border-zinc-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Completed: Download panel */}
            {isCompleted && (
              <>
                <DownloadPanel
                  excelUrl={job.excelUrl}
                  zipUrl={job.zipUrl}
                  totalItems={job.totalItems}
                  imagesGenerated={job.imagesGenerated}
                />
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors border border-zinc-700"
                >
                  <Sparkles className="w-4 h-4" />
                  Process Another Menu
                </button>
              </>
            )}

            {/* Extracted items table */}
            {job.items.length > 0 && <ExtractedTable items={job.items} />}
          </div>

          {/* Right column: Job History */}
          <div className="space-y-6">
            <JobHistory refreshTrigger={historyRefresh} />
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/80 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-zinc-600">
          <p>Glovo Menu Studio — Internal Tool</p>
          <p className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Powered by Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
}
