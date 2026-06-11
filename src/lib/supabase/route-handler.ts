import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrlForServer } from "@/lib/supabase/config";

const EMAIL_OTP_TYPES = new Set<string>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export function getRequestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost.split(",")[0]?.trim()}`;
  }

  return new URL(request.url).origin;
}

export function buildRequestRedirectUrl(request: NextRequest, path: string): URL {
  return new URL(path, getRequestOrigin(request));
}

export function createRouteHandlerClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(getSupabaseUrlForServer()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

export function parseEmailOtpType(value: string | null): EmailOtpType | null {
  if (!value || !EMAIL_OTP_TYPES.has(value)) {
    return null;
  }
  return value as EmailOtpType;
}
