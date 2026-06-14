"use server";

import { revalidatePath } from "next/cache";
import { translateAuthError, validateMemberDisplayName, isDisplayNameMatchingEmail } from "@/lib/auth-messages";
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
  const displayNameError = validateMemberDisplayName(displayName);
  if (displayNameError) {
    return { error: displayNameError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です。" };
  }

  if (isDisplayNameMatchingEmail(user.email, displayName)) {
    return { error: "VRChat上の表示名に、メールアドレスと同じ文字列は使用できません。" };
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
