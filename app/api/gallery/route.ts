import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/gallery
 * Returns completed jobs that produced at least one image, each with its
 * generated images (fresh signed display + download URLs), grouped by job
 * (i.e. by restaurant/menu upload) and ordered most-recent first.
 */
export async function GET() {
  const supabase = createAdminClient();

  // Any job that produced images is shown — including stopped/partial runs.
  // Jobs without images are filtered out below (image_count > 0).
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, created_at, file_name, total_items, extracted_json")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to load gallery" }, { status: 500 });
  }

  type Item = {
    item_name?: string;
    price?: string;
    category?: string;
    image_path?: string | null;
  };

  // Collect every image path across all jobs and sign them in one batch.
  const allPaths: string[] = [];
  for (const job of jobs || []) {
    if (Array.isArray(job.extracted_json)) {
      for (const it of job.extracted_json as Item[]) {
        if (it.image_path) allPaths.push(it.image_path);
      }
    }
  }

  const urlByPath = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("job-outputs")
      .createSignedUrls(allPaths, 3600);
    for (const s of signed || []) {
      if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);
    }
  }

  const result = (jobs || [])
    .map((job) => {
      const items = Array.isArray(job.extracted_json) ? (job.extracted_json as Item[]) : [];
      const images = items
        .filter((it) => it.image_path && urlByPath.get(it.image_path))
        .map((it) => {
          const url = urlByPath.get(it.image_path!)!;
          const safe = (it.item_name || "image").replace(/[^a-z0-9]/gi, "_").slice(0, 60);
          const sep = url.includes("?") ? "&" : "?";
          return {
            item_name: it.item_name || "Untitled",
            price: it.price || "",
            category: it.category || "",
            image_url: url,
            image_download_url: `${url}${sep}download=${encodeURIComponent(safe)}.png`,
          };
        });

      return {
        id: job.id,
        file_name: job.file_name,
        created_at: job.created_at,
        total_items: job.total_items,
        image_count: images.length,
        images,
      };
    })
    .filter((j) => j.image_count > 0);

  return NextResponse.json(result);
}
