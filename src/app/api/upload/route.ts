import { NextRequest, NextResponse } from "next/server";

import { promises as fs } from "fs";

import path from "path";

import sharp from "sharp";

import { revalidateSiteContent } from "@/lib/revalidate-site";
import { getAdminPassword } from "@/lib/data";

import { getMissingSupabaseEnvVars, getSupabaseAdmin } from "@/lib/supabase-admin";



export const runtime = "nodejs";



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

        console.error("[upload] Supabase storage error:", error.message);

        return NextResponse.json(

          {

            error:

              error.message.includes("Bucket not found") ||

              error.message.includes("not found")

                ? "cast-images バケットがありません。Supabase で scripts/supabase-setup.sql を実行してください。"

                : `画像の保存に失敗しました: ${error.message}`,

          },

          { status: 500 }

        );

      }



      const {

        data: { publicUrl },

      } = supabase.storage.from("cast-images").getPublicUrl(filename);



      revalidateSiteContent();

      return NextResponse.json({ url: publicUrl });

    }



    if (process.env.VERCEL === "1") {

      const missing = getMissingSupabaseEnvVars();

      return NextResponse.json(

        {

          error:

            missing.length > 0

              ? `Supabase が未設定です（${missing.join(" / ")}）。Vercel の環境変数を設定して再デプロイしてください。`

              : "本番環境では Supabase ストレージが必要です。",

        },

        { status: 503 }

      );

    }



    const uploadsDir = path.join(process.cwd(), "public", "images", "casts");

    await fs.mkdir(uploadsDir, { recursive: true });

    await fs.writeFile(path.join(uploadsDir, filename), processed);



    return NextResponse.json({ url: `/images/casts/${filename}` });

  } catch (err) {

    const message = err instanceof Error ? err.message : "Upload failed";

    console.error("[upload] Failed:", message);



    if (/sharp|native/i.test(message)) {

      return NextResponse.json(

        { error: "画像処理モジュールの読み込みに失敗しました。再デプロイ後にもう一度お試しください。" },

        { status: 500 }

      );

    }



    return NextResponse.json({ error: `アップロードに失敗しました: ${message}` }, { status: 500 });

  }

}

