export function isSupabaseConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    if (error && typeof error === "object" && "message" in error) {
      return isSupabaseConnectionError(new Error(String((error as { message: unknown }).message)));
    }
    return false;
  }
  return /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network|timeout|Connect Timeout/i.test(
    error.message
  );
}
