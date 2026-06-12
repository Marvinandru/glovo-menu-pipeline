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

  // If completed, refresh signed URLs (in case they expired)
  if (job.status === "completed") {
    if (job.excel_url) {
      const excelPath = `${id}/menu_items.xlsx`;
      const { data } = await supabase.storage
        .from("job-outputs")
        .createSignedUrl(excelPath, 3600);
      if (data?.signedUrl) job.excel_url = data.signedUrl;
    }
    if (job.zip_url) {
      const zipPath = `${id}/images.zip`;
      const { data } = await supabase.storage
        .from("job-outputs")
        .createSignedUrl(zipPath, 3600);
      if (data?.signedUrl) job.zip_url = data.signedUrl;
    }
  }

  return NextResponse.json(job);
}
