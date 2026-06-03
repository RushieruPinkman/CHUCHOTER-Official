import { NextRequest, NextResponse } from "next/server";

import { getAdminPassword, getAllCasts, saveCasts } from "@/lib/data";

import { storageErrorResponse } from "@/lib/api-error";

import { normalizeCast, normalizeCastRole } from "@/lib/cast-roles";

import { revalidateSiteContent } from "@/lib/revalidate-site";

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



    const newCast: Cast = normalizeCast({

      id: body.id || `cast-${Date.now()}`,

      name: body.name,

      nameEn: body.nameEn,

      role: normalizeCastRole(body.role),

      gender: body.gender || "female",

      tagline: body.tagline,

      bio: body.bio,

      image: body.image || "/images/casts/placeholder.svg",

      xUrl: body.xUrl,

      vrchatUrl: body.vrchatUrl,

      order: body.order ?? casts.length + 1,

      active: body.active ?? true,

    });



    casts.push(newCast);

    await saveCasts(casts);

    revalidateSiteContent();

    return NextResponse.json(newCast, { status: 201 });

  } catch (err) {

    return storageErrorResponse(err);

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



    casts[index] = normalizeCast(body);

    await saveCasts(casts);

    revalidateSiteContent();

    return NextResponse.json(casts[index]);

  } catch (err) {

    return storageErrorResponse(err);

  }

}



export async function DELETE(request: NextRequest) {

  if (!(await verifyAuth(request))) return unauthorized();



  try {

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



    const reindexed = filtered

      .sort((a, b) => a.order - b.order)

      .map((cast, index) => ({ ...cast, order: index + 1 }));



    await saveCasts(reindexed);

    revalidateSiteContent();

    return NextResponse.json({ success: true });

  } catch (err) {

    return storageErrorResponse(err);

  }

}



export async function PATCH(request: NextRequest) {

  if (!(await verifyAuth(request))) return unauthorized();



  try {

    const body = (await request.json()) as { reorder?: string[] };

    if (!body.reorder || !Array.isArray(body.reorder)) {

      return NextResponse.json({ error: "reorder array required" }, { status: 400 });

    }



    const casts = await getAllCasts();

    const castMap = new Map(casts.map((cast) => [cast.id, cast]));



    if (body.reorder.some((id) => !castMap.has(id))) {

      return NextResponse.json({ error: "Invalid cast id in reorder" }, { status: 400 });

    }



    if (body.reorder.length !== casts.length) {

      return NextResponse.json({ error: "reorder must include all casts" }, { status: 400 });

    }



    const updated = body.reorder.map((id, index) => ({

      ...castMap.get(id)!,

      order: index + 1,

    }));



    await saveCasts(updated);

    revalidateSiteContent();

    return NextResponse.json(updated);

  } catch (err) {

    return storageErrorResponse(err);

  }

}

