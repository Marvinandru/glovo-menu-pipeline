import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/jobs
 * Fetch recent job history (last 20 jobs).
 */
export async function GET(_req: NextRequest) {
  const supabase = createAdminClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, created_at, file_name, status, progress, total_items, items_done, excel_url, zip_url, error_message")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }

  // Stored signed URLs expire after 1 hour, so regenerate fresh ones for any
  // completed job that produced an output. This keeps history downloads working.
  const refreshed = await Promise.all(
    (jobs || []).map(async (job) => {
      if (job.status !== "completed") return job;

      if (job.excel_url) {
        const { data } = await supabase.storage
          .from("job-outputs")
          .createSignedUrl(`${job.id}/menu_items.xlsx`, 3600, {
            download: "menu_items.xlsx",
          });
        if (data?.signedUrl) job.excel_url = data.signedUrl;
      }
      if (job.zip_url) {
        const { data } = await supabase.storage
          .from("job-outputs")
          .createSignedUrl(`${job.id}/images.zip`, 3600, {
            download: "menu_images.zip",
          });
        if (data?.signedUrl) job.zip_url = data.signedUrl;
      }
      return job;
    })
  );

  return NextResponse.json(refreshed);
}
