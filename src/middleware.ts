import { NextResponse, type NextRequest } from "next/server";
import { enforceSitePrivate } from "@/lib/site-private";

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
    const { updateSession } = await import("@/lib/supabase/middleware");
    return updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
