"use client";

import React, { useEffect, useState } from "react";
import { Clock, CheckCircle2, XCircle, Loader2, RefreshCw, Eye, Square } from "lucide-react";

const ACTIVE_STATUSES = ["pending", "extracting", "generating", "packaging"];

interface Job {
  id: string;
  created_at: string;
  file_name: string;
  status: string;
  progress: number;
  total_items: number;
  items_done: number;
  excel_url: string | null;
  zip_url: string | null;
  error_message: string | null;
}

interface JobHistoryProps {
  refreshTrigger: number; // increment to force refresh
  onSelectJob?: (jobId: string) => void; // load a job into the main view
  activeJobId?: string | null; // currently displayed job
}

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  failed: <XCircle className="w-4 h-4 text-red-400" />,
  extracting: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
  generating: <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />,
  packaging: <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />,
  pending: <Clock className="w-4 h-4 text-zinc-500" />,
};

export default function JobHistory({ refreshTrigger, onSelectJob, activeJobId }: JobHistoryProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch {
      console.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/jobs");
        if (res.ok && !cancelled) setJobs(await res.json());
      } catch {
        // will retry on next refresh
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  // Auto-refresh while any job is still running, so progress/stop stay current.
  useEffect(() => {
    const hasActive = jobs.some((j) => ACTIVE_STATUSES.includes(j.status));
    if (!hasActive) return;
    const t = setInterval(fetchJobs, 3000);
    return () => clearInterval(t);
  }, [jobs]);

  const handleCancel = async (jobId: string) => {
    try {
      await fetch(`/api/job-cancel/${jobId}`, { method: "POST" });
    } catch {
      // best-effort
    } finally {
      fetchJobs();
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6 flex items-center justify-center text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading history...
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-8 text-center text-zinc-500">
        <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No processing jobs yet</p>
        <p className="text-xs mt-1 text-zinc-600">
          Upload a menu to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-zinc-700 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          Recent Jobs
        </h3>
        <button
          onClick={fetchJobs}
          className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-zinc-700/50 max-h-[350px] overflow-y-auto">
        {jobs.map((job) => {
          const isActive = ACTIVE_STATUSES.includes(job.status);
          const isClickable = !!onSelectJob && (job.status === "completed" || isActive);
          return (
          <div
            key={job.id}
            onClick={isClickable ? () => onSelectJob!(job.id) : undefined}
            className={`px-5 py-3.5 flex items-center gap-3 transition-colors ${
              isClickable ? "cursor-pointer" : ""
            } ${
              activeJobId === job.id
                ? "bg-emerald-500/10"
                : "hover:bg-zinc-700/20"
            }`}
          >
            {statusIcon[job.status] || statusIcon.pending}

            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-300 truncate">{job.file_name}</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {new Date(job.created_at).toLocaleString()} •{" "}
                {isActive && job.total_items > 0
                  ? `${job.items_done}/${job.total_items} • ${job.progress}%`
                  : job.total_items > 0
                  ? `${job.total_items} items`
                  : "—"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isClickable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectJob!(job.id);
                  }}
                  className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-700/60 hover:bg-zinc-600 px-2.5 py-1 rounded-md transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
              )}
              {isActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel(job.id);
                  }}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-md transition-colors"
                  title="Stop this job"
                >
                  <Square className="w-3 h-3" />
                  Stop
                </button>
              )}
              {job.status === "completed" && job.excel_url && (
                <a
                  href={job.excel_url}
                  onClick={(e) => e.stopPropagation()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-md transition-colors"
                >
                  Excel
                </a>
              )}
              {job.status === "completed" && job.zip_url && (
                <a
                  href={job.zip_url}
                  onClick={(e) => e.stopPropagation()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-md transition-colors"
                >
                  Images
                </a>
              )}
              {job.status === "failed" && (
                <span className="text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md">
                  Error
                </span>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
