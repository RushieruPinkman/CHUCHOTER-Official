export function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (normalized.includes("email not confirmed")) {
    return "メールアドレスの確認が完了していません。受信したメールのリンクを開いてください。";
  }
  if (normalized.includes("user already registered")) {
    return "このメールアドレスはすでに登録されています。";
  }
  if (normalized.includes("password should be at least")) {
    return "パスワードは6文字以上で設定してください。";
  }
  if (normalized.includes("unable to validate email address")) {
    return "メールアドレスの形式が正しくありません。";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "リクエストが多すぎます。しばらく待ってから再度お試しください。";
  }
  if (normalized.includes("signup is disabled")) {
    return "新規登録は現在受け付けていません。";
  }
  if (normalized.includes("for security purposes")) {
    return "セキュリティのため、同じ操作は一定時間後に再度お試しください。";
  }
  if (
    normalized.includes("error sending confirmation email") ||
    normalized.includes("error sending confirmation mail")
  ) {
    return "確認メールの送信に失敗しました。Supabase の SMTP 設定（Resend のドメイン検証・送信元アドレス・API キー）をご確認ください。詳細は Supabase Dashboard → Logs → Auth logs を参照してください。";
  }

  return message;
}

export function getUserDisplayLabel(email?: string | null): string {
  if (!email) return "会員";
  const local = email.split("@")[0]?.trim();
  return local || "会員";
}

export function getUserProfileLabel(
  email?: string | null,
  displayName?: string | null
): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  return getUserDisplayLabel(email);
}

export function getAuthCallbackErrorMessage(code: string | null): string | null {
  if (code === "auth_callback") {
    return "認証リンクが無効か期限切れです。再度ログインまたは登録をお試しください。";
  }
  return null;
}
