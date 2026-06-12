"use client";

import React from "react";
import { Download, FileSpreadsheet, ImageDown } from "lucide-react";

interface DownloadPanelProps {
  excelUrl: string | null;
  zipUrl: string | null;
  totalItems: number;
  imagesGenerated: number;
}

export default function DownloadPanel({
  excelUrl,
  zipUrl,
  totalItems,
  imagesGenerated,
}: DownloadPanelProps) {
  return (
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-400">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-emerald-400">Ready to Download</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {totalItems} items extracted • {imagesGenerated} images generated
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Excel download */}
        {excelUrl && (
          <a
            href={excelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">Menu Excel</p>
              <p className="text-xs text-zinc-500">.xlsx spreadsheet</p>
            </div>
          </a>
        )}

        {/* ZIP download */}
        {zipUrl && (
          <a
            href={zipUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ImageDown className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">Images ZIP</p>
              <p className="text-xs text-zinc-500">{imagesGenerated} images</p>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}
