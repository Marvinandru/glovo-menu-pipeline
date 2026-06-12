"use client";

import React from "react";
import { Loader2, CheckCircle2, XCircle, Sparkles, Package, ScanText } from "lucide-react";

interface JobProgressProps {
  status: string;
  progress: number;
  totalItems: number;
  itemsDone: number;
  errorMessage?: string | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  pending: {
    label: "Queued",
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/20",
  },
  extracting: {
    label: "Extracting Menu Items",
    icon: <ScanText className="w-5 h-5 animate-pulse" />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  generating: {
    label: "Generating Images",
    icon: <Sparkles className="w-5 h-5 animate-pulse" />,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  packaging: {
    label: "Packaging Files",
    icon: <Package className="w-5 h-5 animate-bounce" />,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  failed: {
    label: "Failed",
    icon: <XCircle className="w-5 h-5" />,
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
};

export default function JobProgress({
  status,
  progress,
  totalItems,
  itemsDone,
  errorMessage,
}: JobProgressProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6 space-y-5">
      {/* Status header */}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bgColor} ${config.color}`}
        >
          {config.icon}
        </div>
        <div>
          <p className={`font-semibold ${config.color}`}>{config.label}</p>
          {status === "generating" && totalItems > 0 && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {itemsDone} of {totalItems} images generated
            </p>
          )}
          {status === "extracting" && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Analyzing menu with Gemini AI...
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              status === "completed"
                ? "bg-emerald-500"
                : status === "failed"
                ? "bg-red-500"
                : "bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-400"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Per-item counter during generation */}
      {status === "generating" && totalItems > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-700/30 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-zinc-200">{totalItems}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Total Items</p>
          </div>
          <div className="bg-zinc-700/30 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{itemsDone}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Images Done</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {status === "failed" && errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
