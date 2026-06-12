import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import {
  CP_ADMIN_BULK_GRANT_AMOUNT,
  CP_ADMIN_BULK_GRANT_CONFIRM_TEXT,
} from "@/lib/cp";
import {
  collectAllCpUserKeys,
  grantCpToAllUsers,
  isCpStoreEnabled,
} from "@/lib/cp-store";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCpStoreEnabled()) {
    return NextResponse.json({
      enabled: false,
      userCount: 0,
    });
  }

  try {
    const userKeys = await collectAllCpUserKeys();
    return NextResponse.json({
      enabled: true,
      userCount: userKeys.length,
      grantAmount: CP_ADMIN_BULK_GRANT_AMOUNT,
      confirmText: CP_ADMIN_BULK_GRANT_CONFIRM_TEXT,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CP 情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCpStoreEnabled()) {
    return NextResponse.json(
      { error: "CP 機能が設定されていません。scripts/supabase-cp.sql を実行してください。" },
      { status: 503 }
    );
  }

  let body: { action?: string; confirmText?: string };
  try {
    body = (await request.json()) as { action?: string; confirmText?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "grant_all") {
    return NextResponse.json({ error: "不明な操作です。" }, { status: 400 });
  }

  if (body.confirmText !== CP_ADMIN_BULK_GRANT_CONFIRM_TEXT) {
    return NextResponse.json(
      { error: `確認テキストが一致しません。「${CP_ADMIN_BULK_GRANT_CONFIRM_TEXT}」と入力してください。` },
      { status: 400 }
    );
  }

  try {
    const result = await grantCpToAllUsers(CP_ADMIN_BULK_GRANT_AMOUNT);
    return NextResponse.json({
      ok: true,
      amount: CP_ADMIN_BULK_GRANT_AMOUNT,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CP 付与に失敗しました" },
      { status: 500 }
    );
  }
}
