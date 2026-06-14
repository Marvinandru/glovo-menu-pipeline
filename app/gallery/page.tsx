"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  ImageIcon,
  Store,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface GalleryImage {
  item_name: string;
  price: string;
  category: string;
  image_url: string;
  image_download_url: string;
}

interface GalleryJob {
  id: string;
  file_name: string;
  created_at: string;
  total_items: number;
  image_count: number;
  images: GalleryImage[];
}

type SortMode = "recent" | "name";

export default function GalleryPage() {
  const [jobs, setJobs] = useState<GalleryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("recent");

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/gallery");
      const d = r.ok ? await r.json() : [];
      setJobs(Array.isArray(d) ? d : []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/gallery");
        const d = r.ok ? await r.json() : [];
        if (!cancelled) setJobs(Array.isArray(d) ? d : []);
      } catch {
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedJobs = useMemo(() => {
    const copy = [...jobs];
    if (sort === "name") {
      copy.sort((a, b) => a.file_name.localeCompare(b.file_name));
    } else {
      copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return copy;
  }, [jobs, sort]);

  const totalImages = jobs.reduce((sum, j) => sum + j.image_count, 0);

  return (
    <div className="min-h-screen bg-grid">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Studio
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                Image Gallery
              </h1>
              <p className="text-[11px] text-zinc-500 -mt-0.5 uppercase tracking-widest">
                {jobs.length} menus • {totalImages} images
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-xl p-1 text-xs">
              <button
                onClick={() => setSort("recent")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  sort === "recent" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSort("name")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  sort === "name" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Name A–Z
              </button>
            </div>
            <button
              onClick={fetchGallery}
              className="p-2.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-32 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading gallery…
          </div>
        ) : sortedJobs.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-300 font-medium">No images yet</p>
            <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
              Process a menu to generate images. Completed jobs with images will
              appear here, grouped by menu.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Studio
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {sortedJobs.map((job) => (
              <section key={job.id}>
                {/* Job (restaurant / menu) heading */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-zinc-100 truncate">
                      {job.file_name}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      {new Date(job.created_at).toLocaleString()} •{" "}
                      {job.image_count} of {job.total_items} images
                    </p>
                  </div>
                </div>

                {/* Image grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {job.images.map((img, i) => (
                    <div
                      key={`${job.id}-${i}`}
                      className="group bg-zinc-800/60 border border-zinc-700/60 rounded-xl overflow-hidden flex flex-col"
                    >
                      <div className="relative aspect-square bg-zinc-900 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.image_url}
                          alt={img.item_name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <a
                          href={img.image_download_url}
                          className="absolute bottom-2 right-2 p-2 rounded-lg bg-zinc-900/80 backdrop-blur text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-600"
                          title="Download image"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="p-3 flex flex-col gap-1 flex-1">
                        <p className="text-sm font-medium text-zinc-200 leading-tight line-clamp-2">
                          {img.item_name}
                        </p>
                        {img.price && (
                          <p className="text-xs text-emerald-400 font-medium">
                            {img.price}
                          </p>
                        )}
                        {img.category && (
                          <span className="mt-auto self-start px-2 py-0.5 bg-zinc-700/50 text-zinc-400 rounded-full text-[10px] truncate max-w-full">
                            {img.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
