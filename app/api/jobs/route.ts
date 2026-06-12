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

  return NextResponse.json(jobs || []);
}
