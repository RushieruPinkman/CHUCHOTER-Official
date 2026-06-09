import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { storageErrorResponse } from "@/lib/api-error";
import { normalizeGachaSerialNumber } from "@/lib/gacha-serial";
import {
  getGachaSerial,
  listRecentGachaSerials,
  markGachaSerialUsed,
} from "@/lib/gacha-serial-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return unauthorized();
  }

  try {
    const serial = request.nextUrl.searchParams.get("serial")?.trim();
    if (serial) {
      const record = await getGachaSerial(normalizeGachaSerialNumber(serial));
      return NextResponse.json({ record });
    }

    const records = await listRecentGachaSerials(30);
    return NextResponse.json({ records });
  } catch (error) {
    return storageErrorResponse(error, "シリアルNo.の取得に失敗しました");
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as { serial?: string; action?: string };
    const serial = String(body.serial ?? "").trim();
    const action = body.action === "mark_used" ? "mark_used" : "lookup";

    if (!serial) {
      return NextResponse.json({ error: "シリアルNo.を入力してください。" }, { status: 400 });
    }

    if (action === "lookup") {
      const record = await getGachaSerial(serial);
      if (!record) {
        return NextResponse.json({ error: "該当するシリアルNo.が見つかりません。" }, { status: 404 });
      }
      return NextResponse.json({ record });
    }

    const result = await markGachaSerialUsed(serial);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, notFound: result.notFound ?? false },
        { status: result.notFound ? 404 : 400 }
      );
    }

    return NextResponse.json({
      record: result.record,
      alreadyUsed: result.alreadyUsed,
    });
  } catch (error) {
    return storageErrorResponse(error, "シリアルNo.の更新に失敗しました");
  }
}
