import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword, getAllCasts, saveCasts } from "@/lib/data";
import type { Cast } from "@/types";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const password = await getAdminPassword();
  return token === password;
}

export async function GET(request: NextRequest) {
  if (!(await verifyAuth(request))) return unauthorized();
  const casts = await getAllCasts();
  return NextResponse.json(casts);
}

export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) return unauthorized();

  try {
    const body = (await request.json()) as Omit<Cast, "id"> & { id?: string };
    const casts = await getAllCasts();

    const newCast: Cast = {
      id: body.id || `cast-${Date.now()}`,
      name: body.name,
      nameEn: body.nameEn,
      role: body.role || "cast",
      gender: body.gender || "female",
      tagline: body.tagline,
      bio: body.bio,
      image: body.image || "/images/casts/placeholder.svg",
      xUrl: body.xUrl,
      vrchatUrl: body.vrchatUrl,
      order: body.order ?? casts.length + 1,
      active: body.active ?? true,
    };

    casts.push(newCast);
    await saveCasts(casts);
    return NextResponse.json(newCast, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAuth(request))) return unauthorized();

  try {
    const body = (await request.json()) as Cast;
    const casts = await getAllCasts();
    const index = casts.findIndex((c) => c.id === body.id);

    if (index === -1) {
      return NextResponse.json({ error: "Cast not found" }, { status: 404 });
    }

    casts[index] = body;
    await saveCasts(casts);
    return NextResponse.json(casts[index]);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAuth(request))) return unauthorized();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const casts = await getAllCasts();
  const filtered = casts.filter((c) => c.id !== id);

  if (filtered.length === casts.length) {
    return NextResponse.json({ error: "Cast not found" }, { status: 404 });
  }

  await saveCasts(filtered);
  return NextResponse.json({ success: true });
}
