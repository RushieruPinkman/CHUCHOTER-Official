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
  if (normalized.includes("redirect") && normalized.includes("not allowed")) {
    return "認証用 URL が Supabase に登録されていません。Dashboard → Authentication → URL Configuration で Site URL と Redirect URLs（/auth/callback）を設定してください。";
  }

  return message;
}

export function getSignUpPendingMessage(): string {
  return "確認メールを送信しました。メール内のリンクを開くと登録が完了し、そのままログインした状態でプロフィールへ移動します。数分経っても届かない場合は迷惑メールを確認するか、「確認メール再送」をお試しください。";
}

export function getDuplicateSignUpMessage(): string {
  return "このメールアドレスはすでに登録されています。ログインしてください。確認メールが届いていない場合は、ログイン画面の「確認メール再送」から再送できます。";
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

const MEMBER_DISPLAY_NAME_MAX_LENGTH = 32;

export function validateMemberDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "VRChat上の表示名を入力してください。";
  }
  if (trimmed.length > MEMBER_DISPLAY_NAME_MAX_LENGTH) {
    return `表示名は${MEMBER_DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください。`;
  }
  return null;
}

/** 表示名が未設定、またはメールアドレス（@前含む）と同一 */
export function isDisplayNameMatchingEmail(
  email: string | null | undefined,
  displayName: string | null | undefined
): boolean {
  if (!email?.trim()) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const localPart = normalizedEmail.split("@")[0]?.trim() ?? "";
  const normalizedName = displayName?.trim().toLowerCase() ?? "";

  if (!normalizedName) return true;

  return normalizedName === normalizedEmail || normalizedName === localPart;
}

export function getDisplayNameEmailWarningMessage(): string {
  return "表示名がメールアドレスと同じになっています。VRChat上で表示されている名前に変更してください。";
}

export function getAuthCallbackErrorMessage(code: string | null): string | null {
  if (code === "auth_callback") {
    return "認証リンクが無効か期限切れです。再度ログインまたは登録をお試しください。";
  }
  return null;
}
