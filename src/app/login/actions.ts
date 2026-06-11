"use server";

import { redirect } from "next/navigation";
import {
  getDuplicateSignUpMessage,
  getSignUpPendingMessage,
  translateAuthError,
} from "@/lib/auth-messages";
import { getAuthCallbackUrl } from "@/lib/auth-url";
import { createClient } from "@/lib/supabase/server";
import { isUserAuthEnabledOnServer } from "@/lib/supabase/config";

export type AuthFormState = {
  error?: string;
  success?: string;
};

function validatePasswordPair(password: string, passwordConfirm: string): string | null {
  if (password.length < 6) {
    return "パスワードは6文字以上で設定してください。";
  }
  if (password !== passwordConfirm) {
    return "パスワード（確認）が一致しません。";
  }
  return null;
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!isUserAuthEnabledOnServer()) {
    return { error: "ログイン機能が設定されていません。" };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/").trim() || "/";

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  redirect(nextPath.startsWith("/") ? nextPath : "/");
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!isUserAuthEnabledOnServer()) {
    return { error: "新規登録機能が設定されていません。" };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }

  const passwordError = validatePasswordPair(password, passwordConfirm);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthCallbackUrl("/profile"),
    },
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  if (data.user?.identities?.length === 0) {
    return { error: getDuplicateSignUpMessage() };
  }

  if (data.user && !data.session) {
    return { success: getSignUpPendingMessage() };
  }

  if (data.session) {
    redirect("/profile");
  }

  return { success: getSignUpPendingMessage() };
}

export async function resendConfirmationAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!isUserAuthEnabledOnServer()) {
    return { error: "メール認証機能が設定されていません。" };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "メールアドレスを入力してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: getAuthCallbackUrl("/profile"),
    },
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  return {
    success: "確認メールを再送しました。受信トレイと迷惑メールをご確認ください。",
  };
}

export async function requestPasswordResetAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!isUserAuthEnabledOnServer()) {
    return { error: "パスワード再設定機能が設定されていません。" };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "メールアドレスを入力してください。" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthCallbackUrl("/login/reset-password"),
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  return {
    success:
      "パスワード再設定用のメールを送信しました。メール内のリンクから新しいパスワードを設定してください。",
  };
}

export async function updatePasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!isUserAuthEnabledOnServer()) {
    return { error: "パスワード再設定機能が設定されていません。" };
  }

  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const nextPath = String(formData.get("next") ?? "/profile").trim() || "/profile";

  const passwordError = validatePasswordPair(password, passwordConfirm);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "セッションが無効です。再度メールのリンクからお試しください。" };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: translateAuthError(error.message) };
  }

  redirect(nextPath.startsWith("/") ? nextPath : "/profile");
}

export async function signOutAction(): Promise<void> {
  if (isUserAuthEnabledOnServer()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/");
}
