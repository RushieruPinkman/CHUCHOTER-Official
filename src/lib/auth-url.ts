/** 認証メールのリダイレクト先などに使う公開サイト origin */

import { DEFAULT_SITE_URL } from "@/lib/site";

export function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_SITE_URL;
  }

  return "http://localhost:3000";
}

export function getAuthCallbackUrl(nextPath = "/profile"): string {
  const next = nextPath.startsWith("/") ? nextPath : "/profile";
  return `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;
}
