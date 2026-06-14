import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/job-cancel/[id]
 * Stops a running job. The pipeline checks the job status between items and
 * bails out cooperatively; for orphaned jobs (server restarted mid-run) this
 * simply flips the stuck row to a final state so it stops showing as "running".
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: job, error } = await supabase
    .from("jobs")
    .select("status, items_done, total_items")
    .eq("id", id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "completed" || job.status === "failed") {
    return NextResponse.json({ error: "Job is not running" }, { status: 400 });
  }

  const msg = `Stopped by user. ${job.items_done || 0}/${job.total_items || 0} images generated.`;
  await supabase
    .from("jobs")
    .update({ status: "failed", error_message: msg })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
