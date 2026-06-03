import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword, getStatus, saveStatus } from "@/lib/data";
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
  return NextResponse.json(status);
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyAuth(request))) return unauthorized();

  try {
    const body = (await request.json()) as SiteStatus;
    await saveStatus({ ...body, updatedAt: new Date().toISOString() });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
