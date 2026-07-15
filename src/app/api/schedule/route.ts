import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword, getSchedule, saveSchedule, saveStatus } from "@/lib/data";
import { storageErrorResponse } from "@/lib/api-error";
import { revalidateSiteContent } from "@/lib/revalidate-site";
import type { ScheduleEntry, SiteStatus } from "@/types";

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const password = await getAdminPassword();
  return authHeader.slice(7) === password;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const schedule = await getSchedule();
  return NextResponse.json(schedule, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAuth(request))) return unauthorized();

  try {
    const body = (await request.json()) as ScheduleEntry[];
    await saveSchedule(body);
    revalidateSiteContent();
    return NextResponse.json({ success: true });
  } catch (err) {
    return storageErrorResponse(err);
  }
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
