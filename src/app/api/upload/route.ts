import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { getAdminPassword } from "@/lib/data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === (await getAdminPassword());
}

export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await sharp(buffer)
      .rotate()
      .resize(900, 1200, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toBuffer();

    const filename = `cast-${Date.now()}.webp`;
    const supabase = getSupabaseAdmin();

    if (supabase) {
      const { error } = await supabase.storage.from("cast-images").upload(filename, processed, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

      if (error) {
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("cast-images").getPublicUrl(filename);

      return NextResponse.json({ url: publicUrl });
    }

    const uploadsDir = path.join(process.cwd(), "public", "images", "casts");
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), processed);

    return NextResponse.json({ url: `/images/casts/${filename}` });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
