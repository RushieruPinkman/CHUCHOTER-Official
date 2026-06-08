"use server";

import { revalidatePath } from "next/cache";
import { translateAuthError } from "@/lib/auth-messages";
import { createClient } from "@/lib/supabase/server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export type ProfileFormState = {
  error?: string;
  success?: string;
  displayName?: string;
};

export async function updateDisplayNameAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  if (!isUserAuthEnabledOnServer()) {
    return { error: "プロフィール機能が設定されていません。" };
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) {
    return { error: "表示名を入力してください。" };
  }
  if (displayName.length > 32) {
    return { error: "表示名は32文字以内で入力してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です。" };
  }

  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  revalidatePath("/profile");
  return { success: "表示名を更新しました。", displayName };
}
