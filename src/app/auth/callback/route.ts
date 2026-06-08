import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/profile";
  const next = nextRaw.startsWith("/") ? nextRaw : "/profile";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
}
