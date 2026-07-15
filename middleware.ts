import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

/**
 * Opt-in matcher: only routes that need Supabase session refresh for SSR.
 *
 * Public pages (/, /casts, /schedule, /system, /media, …) skip middleware
 * entirely — this is the main lever for Edge Middleware / Edge Request volume.
 * API routes authenticate themselves and are intentionally excluded.
 *
 * Logged-in browsing of public pages still works: the browser Supabase client
 * and API Route Handlers refresh cookies when needed. No Supabase table
 * reads/writes happen here.
 */
export const config = {
  matcher: [
    "/auth/:path*",
    "/login",
    "/login/:path*",
    "/register",
    "/profile",
    "/profile/:path*",
    "/dm",
    "/dm/:path*",
    "/bonus",
    "/bonus/:path*",
    "/gacha",
    "/gacha/:path*",
    "/collection",
    "/collection/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
