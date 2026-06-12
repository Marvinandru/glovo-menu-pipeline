import { createClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client (uses anon key).
 * Safe to use in Client Components for reading public data / polling job status.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
