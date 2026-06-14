"use client";

import React from "react";
import { Loader2, ImageOff, Download, Clock, AlertTriangle } from "lucide-react";

interface MenuItem {
  item_name: string;
  description: string;
  price: string;
  category: string;
  image_status?: "pending" | "done" | "failed" | "skipped";
  image_url?: string | null;
  image_download_url?: string | null;
}

interface ImageGalleryProps {
  items: MenuItem[];
  /** True while the job is still generating, so pending items show a spinner. */
  generating?: boolean;
}

function StatusBadge({ status }: { status?: MenuItem["image_status"] }) {
  if (status === "done") return null;
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending: {
      label: "Generating…",
      cls: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    failed: {
      label: "Failed",
      cls: "text-red-400 bg-red-500/10 border-red-500/20",
      icon: <ImageOff className="w-3 h-3" />,
    },
    skipped: {
      label: "Skipped — rate limit",
      cls: "text-zinc-400 bg-zinc-600/20 border-zinc-600/30",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  };
  const cfg = map[status || "pending"] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function ImageGallery({ items, generating }: ImageGalleryProps) {
  if (!items || items.length === 0) return null;

  const doneCount = items.filter((i) => i.image_status === "done").length;

  return (
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-zinc-700 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Generated Images
        </h3>
        <span className="text-xs font-normal text-zinc-500 bg-zinc-700/50 px-2.5 py-1 rounded-full">
          {doneCount}/{items.length} images
        </span>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[560px] overflow-y-auto scrollbar-thin">
        {items.map((item, i) => {
          const status = item.image_status || (generating ? "pending" : "failed");
          const showSpinner = status === "pending" && generating;
          return (
            <div
              key={`${item.item_name}-${i}`}
              className="group bg-zinc-900/50 border border-zinc-700/60 rounded-xl overflow-hidden flex flex-col"
            >
              {/* Image / status area */}
              <div className="relative aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.item_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {item.image_download_url && (
                      <a
                        href={item.image_download_url}
                        className="absolute bottom-2 right-2 p-2 rounded-lg bg-zinc-900/80 backdrop-blur text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-600"
                        title="Download image"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-500 px-2 text-center">
                    {showSpinner ? (
                      <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                    ) : status === "skipped" ? (
                      <Clock className="w-7 h-7 text-zinc-600" />
                    ) : (
                      <ImageOff className="w-7 h-7 text-zinc-600" />
                    )}
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="p-3 flex flex-col gap-1.5 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-200 leading-tight line-clamp-2">
                    {item.item_name}
                  </p>
                </div>
                <p className="text-xs text-emerald-400 font-medium">{item.price}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="px-2 py-0.5 bg-zinc-700/50 text-zinc-400 rounded-full text-[10px] truncate max-w-[60%]">
                    {item.category}
                  </span>
                  <StatusBadge status={item.image_status} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
