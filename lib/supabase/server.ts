import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase admin client (uses service role key).
 * Used in API routes / Server Actions for privileged operations:
 * inserting jobs, uploading to Storage, etc.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
