import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getMissingSupabaseEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.SUPABASE_URL?.trim()) missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  return missing;
}

export function isRemoteStorageEnabled(): boolean {
  return getMissingSupabaseEnvVars().length === 0;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isRemoteStorageEnabled()) return null;

  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }

  return client;
}
