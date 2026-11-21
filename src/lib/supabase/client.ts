import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

/**
 * Create a Supabase client for use in browser/client components.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
