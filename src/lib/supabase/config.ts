/** 会員ログイン（Supabase Auth）用の公開設定 */

export function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;
}

/** ブラウザ向け（NEXT_PUBLIC のみ） */
export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
}

/** サーバー・Middleware 向け（SUPABASE_URL も参照） */
export function getSupabaseUrlForServer(): string | undefined {
  return getSupabaseUrl() || process.env.SUPABASE_URL?.trim() || undefined;
}

export function isUserAuthEnabled(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function isUserAuthEnabledOnServer(): boolean {
  return Boolean(getSupabaseUrlForServer() && getSupabaseAnonKey());
}

export function getMissingUserAuthEnvVars(): string[] {
  const missing: string[] = [];
  if (!getSupabaseUrl()) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!getSupabaseAnonKey()) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return missing;
}
