import { NextRequest, NextResponse } from "next/server";

import {

  getAdminPassword,

  getAllAnnouncements,

  getAnnouncements,

  saveAnnouncements,

} from "@/lib/data";

import { storageErrorResponse } from "@/lib/api-error";

import { revalidateSiteContent } from "@/lib/revalidate-site";

import type { Announcement } from "@/types";



async function verifyAuth(request: NextRequest): Promise<boolean> {

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) return false;

  return authHeader.slice(7) === (await getAdminPassword());

}



function unauthorized() {

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

}



export async function GET(request: NextRequest) {

  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {

    if (!(await verifyAuth(request))) return unauthorized();

    const items = await getAllAnnouncements();

    return NextResponse.json(items);

  }



  const items = await getAnnouncements();

  return NextResponse.json(items);

}



export async function POST(request: NextRequest) {

  if (!(await verifyAuth(request))) return unauthorized();



  try {

    const body = (await request.json()) as Omit<Announcement, "id"> & { id?: string };

    const items = await getAllAnnouncements();



    const item: Announcement = {

      id: body.id || `announce-${Date.now()}`,

      title: body.title,

      body: body.body,

      publishedAt: body.publishedAt || new Date().toISOString().slice(0, 10),

      active: body.active ?? true,

      pinned: body.pinned ?? false,

    };



    items.push(item);

    await saveAnnouncements(items);

    revalidateSiteContent();

    return NextResponse.json(item, { status: 201 });

  } catch (err) {

    return storageErrorResponse(err);

  }

}



export async function PUT(request: NextRequest) {

  if (!(await verifyAuth(request))) return unauthorized();



  try {

    const body = (await request.json()) as Announcement;

    const items = await getAllAnnouncements();

    const index = items.findIndex((a) => a.id === body.id);



    if (index === -1) {

      return NextResponse.json({ error: "Not found" }, { status: 404 });

    }



    items[index] = body;

    await saveAnnouncements(items);

    revalidateSiteContent();

    return NextResponse.json(items[index]);

  } catch (err) {

    return storageErrorResponse(err);

  }

}



export async function DELETE(request: NextRequest) {

  if (!(await verifyAuth(request))) return unauthorized();



  try {

    const id = new URL(request.url).searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });



    const items = await getAllAnnouncements();

    const filtered = items.filter((a) => a.id !== id);



    if (filtered.length === items.length) {

      return NextResponse.json({ error: "Not found" }, { status: 404 });

    }



    await saveAnnouncements(filtered);

    revalidateSiteContent();

    return NextResponse.json({ success: true });

  } catch (err) {

    return storageErrorResponse(err);

  }

}

