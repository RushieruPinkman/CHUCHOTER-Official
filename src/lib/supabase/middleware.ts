import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrlForServer, isUserAuthEnabledOnServer } from "@/lib/supabase/config";

/** Supabase Auth cookie names look like `sb-<ref>-auth-token` (chunked variants included). */
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));
}

/**
 * Refresh the Supabase session only when an auth cookie is present.
 * Anonymous traffic must not pay for getUser() on every page view —
 * those invocations drive Vercel Observability Events volume.
 */
export async function updateSession(request: NextRequest) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.next({ request });
  }

  if (!hasSupabaseAuthCookie(request)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrlForServer()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
