import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import {
  CP_ADMIN_BULK_GRANT_AMOUNT,
  CP_ADMIN_BULK_GRANT_CONFIRM_TEXT,
  CP_ADMIN_USER_GRANT_CONFIRM_TEXT,
} from "@/lib/cp";
import {
  collectAllCpUserKeys,
  grantCp,
  grantCpToAllUsers,
  isCpStoreEnabled,
  listCpAdminUsers,
} from "@/lib/cp-store";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCpStoreEnabled()) {
    return NextResponse.json({
      enabled: false,
      userCount: 0,
      users: [],
    });
  }

  try {
    const userKeys = await collectAllCpUserKeys();
    const users = await listCpAdminUsers();
    return NextResponse.json({
      enabled: true,
      userCount: userKeys.length,
      grantAmount: CP_ADMIN_BULK_GRANT_AMOUNT,
      confirmText: CP_ADMIN_BULK_GRANT_CONFIRM_TEXT,
      userGrantConfirmText: CP_ADMIN_USER_GRANT_CONFIRM_TEXT,
      users,
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

  let body: {
    action?: string;
    confirmText?: string;
    userKey?: string;
    amount?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "grant_all") {
    if (body.confirmText !== CP_ADMIN_BULK_GRANT_CONFIRM_TEXT) {
      return NextResponse.json(
        {
          error: `確認テキストが一致しません。「${CP_ADMIN_BULK_GRANT_CONFIRM_TEXT}」と入力してください。`,
        },
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

  if (body.action === "grant_user") {
    const userKey = body.userKey?.trim();
    const amount = body.amount;

    if (!userKey) {
      return NextResponse.json({ error: "付与対象ユーザーを指定してください。" }, { status: 400 });
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 1) {
      return NextResponse.json({ error: "付与 CP は 1 以上の数値で指定してください。" }, { status: 400 });
    }
    if (body.confirmText !== CP_ADMIN_USER_GRANT_CONFIRM_TEXT) {
      return NextResponse.json(
        {
          error: `確認テキストが一致しません。「${CP_ADMIN_USER_GRANT_CONFIRM_TEXT}」と入力してください。`,
        },
        { status: 400 }
      );
    }

    try {
      const balance = await grantCp(userKey, Math.floor(amount), "admin_user_grant", null);
      return NextResponse.json({
        ok: true,
        userKey,
        amount: Math.floor(amount),
        balance,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "CP 付与に失敗しました" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "不明な操作です。" }, { status: 400 });
}
