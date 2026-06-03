import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/data";
import { getStorageStatus } from "@/lib/site-storage";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === (await getAdminPassword());
}

export async function GET(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = getStorageStatus();
  let supabaseOk = false;
  let supabaseError: string | null = null;

  if (status.remoteStorage) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error } = await supabase.from("site_data").select("key").limit(1);
      if (error) {
        supabaseError = error.message;
      } else {
        supabaseOk = true;
      }
    }
  }

  return NextResponse.json({
    ...status,
    supabaseOk,
    supabaseError,
  });
}
