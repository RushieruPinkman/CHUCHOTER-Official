import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

/**
 * Session refresh only where SSR auth cookies matter.
 * Member feature pages (/gacha, /bonus, /collection, /dm) authenticate via
 * client + API routes — keeping them out of the matcher cuts Edge Requests.
 */
export const config = {
  matcher: [
    "/auth/:path*",
    "/login",
    "/login/:path*",
    "/register",
    "/profile",
    "/profile/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
