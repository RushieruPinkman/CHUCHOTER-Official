import "server-only";

import {
  buildEmptyCpState,
  CP_GACHA_SINGLE_COST,
  CP_GACHA_TEN_COST,
  CP_TASK_REWARD,
  DAILY_TASKS,
  getDailyTaskById,
  isDailyTaskId,
  type CpState,
  type DailyTaskId,
} from "@/lib/cp";
import { getGachaDayJst } from "@/lib/gacha-daily-limit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface CpBalanceRow {
  user_key: string;
  balance: number;
  updated_at: string;
}

interface TaskCompletionRow {
  task_id: string;
}

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    /user_cp_balances|user_cp_ledger|user_daily_task_completions/.test(error.message ?? "")
  );
}

export function isCpStoreEnabled(): boolean {
  return Boolean(getSupabaseAdmin());
}

function buildCpState(balance: number, completedTaskIds: DailyTaskId[], taskDate: string): CpState {
  const completedSet = new Set(completedTaskIds);
  return {
    balance,
    taskDate,
    completedTaskIds,
    tasks: DAILY_TASKS.map((task) => ({
      ...task,
      completed: completedSet.has(task.id),
    })),
    costs: {
      singleDraw: CP_GACHA_SINGLE_COST,
      tenDraw: CP_GACHA_TEN_COST,
    },
    enabled: true,
  };
}

export async function getCpState(userKey: string, taskDate = getGachaDayJst()): Promise<CpState> {
  if (!isCpStoreEnabled()) {
    return buildEmptyCpState(taskDate, false);
  }

  const supabase = getSupabaseAdmin()!;

  const [{ data: balanceRow, error: balanceError }, { data: taskRows, error: taskError }] =
    await Promise.all([
      supabase.from("user_cp_balances").select("balance").eq("user_key", userKey).maybeSingle(),
      supabase
        .from("user_daily_task_completions")
        .select("task_id")
        .eq("user_key", userKey)
        .eq("task_date", taskDate),
    ]);

  if (balanceError && !isMissingTableError(balanceError)) {
    throw new Error(balanceError.message);
  }
  if (taskError && !isMissingTableError(taskError)) {
    throw new Error(taskError.message);
  }
  if (isMissingTableError(balanceError) || isMissingTableError(taskError)) {
    return buildEmptyCpState(taskDate, false);
  }

  const completedTaskIds = ((taskRows as TaskCompletionRow[] | null) ?? [])
    .map((row) => row.task_id)
    .filter(isDailyTaskId);

  return buildCpState((balanceRow as CpBalanceRow | null)?.balance ?? 0, completedTaskIds, taskDate);
}

async function addCpLedgerEntry(
  userKey: string,
  amount: number,
  reason: string,
  refId?: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase.from("user_cp_ledger").insert({
    id: crypto.randomUUID(),
    user_key: userKey,
    amount,
    reason,
    ref_id: refId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function ensureBalanceRow(userKey: string): Promise<number> {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from("user_cp_balances")
    .select("balance")
    .eq("user_key", userKey)
    .maybeSingle();

  if (error && !isMissingTableError(error)) {
    throw new Error(error.message);
  }

  if (data) {
    return (data as CpBalanceRow).balance;
  }

  const { error: insertError } = await supabase.from("user_cp_balances").insert({
    user_key: userKey,
    balance: 0,
  });

  if (insertError && !/duplicate key/i.test(insertError.message ?? "")) {
    throw new Error(insertError.message);
  }

  return 0;
}

async function setBalance(userKey: string, nextBalance: number): Promise<void> {
  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase
    .from("user_cp_balances")
    .upsert(
      {
        user_key: userKey,
        balance: nextBalance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_key" }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function completeDailyTask(
  userKey: string,
  taskId: DailyTaskId
): Promise<CpState> {
  if (!isCpStoreEnabled()) {
    throw new Error("CP 機能が設定されていません。scripts/supabase-cp.sql を実行してください。");
  }

  const task = getDailyTaskById(taskId);
  if (!task) {
    throw new Error("不明なタスクです。");
  }

  const taskDate = getGachaDayJst();
  const supabase = getSupabaseAdmin()!;

  const { error: completionError } = await supabase.from("user_daily_task_completions").insert({
    user_key: userKey,
    task_date: taskDate,
    task_id: taskId,
  });

  if (completionError) {
    if (completionError.code === "23505") {
      return getCpState(userKey, taskDate);
    }
    if (isMissingTableError(completionError)) {
      throw new Error("CP テーブルが未作成です。scripts/supabase-cp.sql を実行してください。");
    }
    throw new Error(completionError.message);
  }

  const currentBalance = await ensureBalanceRow(userKey);
  const nextBalance = currentBalance + CP_TASK_REWARD;
  await setBalance(userKey, nextBalance);
  await addCpLedgerEntry(userKey, CP_TASK_REWARD, `daily_task:${taskId}`, taskDate);

  return getCpState(userKey, taskDate);
}

export async function spendCp(
  userKey: string,
  amount: number,
  reason: string,
  refId?: string | null
): Promise<number> {
  if (!isCpStoreEnabled()) {
    throw new Error("CP 機能が設定されていません。");
  }
  if (amount <= 0) {
    throw new Error("消費 CP が不正です。");
  }

  const currentBalance = await ensureBalanceRow(userKey);
  if (currentBalance < amount) {
    throw new Error(`CP が不足しています（必要: ${amount} / 所持: ${currentBalance}）。`);
  }

  const nextBalance = currentBalance - amount;
  await setBalance(userKey, nextBalance);
  await addCpLedgerEntry(userKey, -amount, reason, refId ?? null);
  return nextBalance;
}

export async function spendCpForGachaDraw(
  userKey: string,
  count: 1 | 10
): Promise<number> {
  const cost = count === 10 ? CP_GACHA_TEN_COST : CP_GACHA_SINGLE_COST;
  return spendCp(userKey, cost, count === 10 ? "gacha_ten_draw" : "gacha_single_draw");
}
