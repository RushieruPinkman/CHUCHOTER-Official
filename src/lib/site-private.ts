import { NextResponse, type NextRequest } from "next/server";

/**
 * Production is private by default until SITE_PRIVATE=false.
 * Set SITE_PASSWORD on Vercel so operators can still open the site (Basic Auth).
 */
export function isSitePrivate(): boolean {
  const flag = process.env.SITE_PRIVATE?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  if (flag === "1" || flag === "true" || flag === "on") return true;
  return process.env.VERCEL_ENV === "production";
}

function getSitePassword(): string | null {
  const password = process.env.SITE_PASSWORD?.trim();
  return password || null;
}

function isCronBypass(request: NextRequest): boolean {
  if (!request.nextUrl.pathname.startsWith("/api/cron/")) return false;
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function checkBasicAuth(request: NextRequest, password: string): boolean {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    const provided = separator >= 0 ? decoded.slice(separator + 1) : decoded;
    return provided === password;
  } catch {
    return false;
  }
}

function privateUnavailableResponse(): NextResponse {
  const body = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>CHUCHOTER — 非公開</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif;
      background:
        radial-gradient(ellipse at 20% 0%, rgba(120, 80, 40, 0.35), transparent 50%),
        radial-gradient(ellipse at 80% 100%, rgba(40, 30, 20, 0.8), transparent 45%),
        #0c0a08;
      color: #f3e8d8;
    }
    main { text-align: center; padding: 2rem; }
    h1 { font-weight: 500; letter-spacing: 0.28em; font-size: 1.35rem; margin: 0 0 1rem; }
    p { margin: 0; opacity: 0.72; font-size: 0.95rem; letter-spacing: 0.06em; }
  </style>
</head>
<body>
  <main>
    <h1>CHUCHOTER</h1>
    <p>現在サイトは非公開です。</p>
  </main>
</body>
</html>`;

  return new NextResponse(body, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": "3600",
    },
  });
}

function unauthorizedResponse(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="CHUCHOTER", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

/** Returns a blocking response when the site is private and the request is not allowed. */
export function enforceSitePrivate(request: NextRequest): NextResponse | null {
  if (!isSitePrivate()) return null;
  if (isCronBypass(request)) return null;

  const password = getSitePassword();
  if (password) {
    if (checkBasicAuth(request, password)) return null;
    return unauthorizedResponse();
  }

  return privateUnavailableResponse();
}
