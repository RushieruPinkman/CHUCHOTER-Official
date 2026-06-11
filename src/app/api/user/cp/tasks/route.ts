import { NextRequest, NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { isDailyTaskId } from "@/lib/cp";
import { resolveCpRequestUser } from "@/lib/cp-auth";
import { completeDailyTask } from "@/lib/cp-store";

export async function POST(request: NextRequest) {
  try {
    const user = await resolveCpRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json()) as { taskId?: string };
    const taskId = String(body.taskId ?? "").trim();

    if (!isDailyTaskId(taskId)) {
      return NextResponse.json({ error: "不明なタスクです。" }, { status: 400 });
    }

    const state = await completeDailyTask(user.userKey, taskId);
    return NextResponse.json(state);
  } catch (error) {
    return storageErrorResponse(error, "デイリータスクの完了に失敗しました");
  }
}
