import { createClient } from "@supabase/supabase-js";

// Fallback placeholders prevent createClient() from throwing during static
// prerender when NEXT_PUBLIC_* vars are not injected yet.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key"
);