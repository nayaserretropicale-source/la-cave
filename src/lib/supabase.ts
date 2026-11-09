import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

// Lazy proxy: defers createClient until first access so module evaluation
// during SSR prerendering doesn't throw when env vars are absent at build time.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const target = getClient();
    const value = (target as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
  },
});