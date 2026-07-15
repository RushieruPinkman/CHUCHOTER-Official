/**
 * Prefer bytes from Supabase Storage / static CDN instead of Vercel Origin
 * (Image Optimization + Function responses drive Fast Origin Transfer).
 */
export function shouldBypassVercelImageOptimizer(src: string): boolean {
  const value = src.trim();
  if (!value) return true;
  if (/^https?:\/\//i.test(value)) return true;
  if (value.endsWith(".svg")) return true;
  // Local public assets are already compressed (webp); avoid /_next/image origin work.
  if (value.startsWith("/")) return true;
  return false;
}
