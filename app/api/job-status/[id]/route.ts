import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/job-status/[id]
 * Poll the status of a processing job.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: job, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // If completed, refresh the bundle download URLs (in case they expired)
  if (job.status === "completed") {
    if (job.excel_url) {
      const excelPath = `${id}/menu_items.xlsx`;
      const { data } = await supabase.storage
        .from("job-outputs")
        .createSignedUrl(excelPath, 3600, { download: "menu_items.xlsx" });
      if (data?.signedUrl) job.excel_url = data.signedUrl;
    }
    if (job.zip_url) {
      const zipPath = `${id}/images.zip`;
      const { data } = await supabase.storage
        .from("job-outputs")
        .createSignedUrl(zipPath, 3600, { download: "menu_images.zip" });
      if (data?.signedUrl) job.zip_url = data.signedUrl;
    }
  }

  // Attach fresh signed URLs for each generated item image (display + download)
  // so the gallery can render them live during generation and afterwards.
  if (Array.isArray(job.extracted_json)) {
    const items = job.extracted_json as Array<{
      item_name?: string;
      image_path?: string | null;
      image_url?: string | null;
      image_download_url?: string | null;
    }>;
    const paths = items
      .map((it) => it.image_path)
      .filter((p): p is string => typeof p === "string" && p.length > 0);

    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from("job-outputs")
        .createSignedUrls(paths, 3600);
      const urlByPath = new Map(
        (signed || [])
          .filter((s) => s.signedUrl && s.path)
          .map((s) => [s.path as string, s.signedUrl])
      );

      job.extracted_json = items.map((it) => {
        const url = it.image_path ? urlByPath.get(it.image_path) : undefined;
        if (!url) return it;
        const safe = (it.item_name || "image").replace(/[^a-z0-9]/gi, "_").slice(0, 60);
        const sep = url.includes("?") ? "&" : "?";
        return {
          ...it,
          image_url: url,
          image_download_url: `${url}${sep}download=${encodeURIComponent(safe)}.png`,
        };
      });
    }
  }

  return NextResponse.json(job);
}
