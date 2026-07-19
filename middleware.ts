import { NextResponse, type NextRequest } from "next/server";
import { enforceSitePrivate } from "@/lib/site-private";
import { updateSession } from "@/lib/supabase/middleware";

function needsSessionRefresh(pathname: string): boolean {
  return (
    pathname.startsWith("/auth/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

export async function middleware(request: NextRequest) {
  const privateResponse = enforceSitePrivate(request);
  if (privateResponse) return privateResponse;

  if (needsSessionRefresh(request.nextUrl.pathname)) {
    return updateSession(request);
  }

  return NextResponse.next();
}

/**
 * Broad matcher so private mode can gate the whole site.
 * Static assets stay out; session refresh still only runs on auth paths above.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
