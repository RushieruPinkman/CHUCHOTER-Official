import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword, getStatus, saveStatus } from "@/lib/data";
import { storageErrorResponse } from "@/lib/api-error";
import { revalidateSiteContent } from "@/lib/revalidate-site";
import type { SiteStatus } from "@/types";

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === (await getAdminPassword());
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const status = await getStatus();
  // Short shared CDN cache — public status payload is tiny; misses still cost origin.
  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
    },
  });
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyAuth(request))) return unauthorized();

  try {
    const body = (await request.json()) as SiteStatus;
    await saveStatus({ ...body, updatedAt: new Date().toISOString() });
    revalidateSiteContent();
    return NextResponse.json({ success: true });
  } catch (err) {
    return storageErrorResponse(err);
  }
}
