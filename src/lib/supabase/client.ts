import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, isUserAuthEnabled } from "@/lib/supabase/config";

export function createClient() {
  if (!isUserAuthEnabled()) {
    throw new Error("User auth is not configured");
  }

  return createBrowserClient(getSupabaseUrl()!, getSupabaseAnonKey()!);
}
