import { NextResponse, type NextRequest } from "next/server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";
import {
  buildRequestRedirectUrl,
  createRouteHandlerClient,
  parseEmailOtpType,
} from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";

function resolveNextPath(searchParams: URLSearchParams): string {
  const nextRaw = searchParams.get("next") ?? "/profile";
  return nextRaw.startsWith("/") ? nextRaw : "/profile";
}

export async function GET(request: NextRequest) {
  if (!isUserAuthEnabledOnServer()) {
    return NextResponse.redirect(buildRequestRedirectUrl(request, "/login"));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = parseEmailOtpType(searchParams.get("type"));
  const next = resolveNextPath(searchParams);

  const successUrl = buildRequestRedirectUrl(request, next);
  const errorUrl = buildRequestRedirectUrl(request, "/login?error=auth_callback");

  if (!code && !(tokenHash && otpType)) {
    return NextResponse.redirect(errorUrl);
  }

  const response = NextResponse.redirect(successUrl);
  const supabase = createRouteHandlerClient(request, response);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(errorUrl);
    }
    return response;
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash!,
    type: otpType!,
  });

  if (error) {
    return NextResponse.redirect(errorUrl);
  }

  return response;
}
