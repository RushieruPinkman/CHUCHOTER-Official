"use client";

import { useActionState } from "react";
import { updatePasswordAction, type AuthFormState } from "@/app/login/actions";
import LoginPanelFrame from "@/components/LoginPanelFrame";

const inputClass =
  "w-full border border-[var(--color-border)] bg-deep px-3 py-2.5 text-cream focus:border-gold focus:outline-none";

const initialState: AuthFormState = {};

interface ResetPasswordFormProps {
  nextPath?: string;
}

export default function ResetPasswordForm({ nextPath = "/profile" }: ResetPasswordFormProps) {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  return (
    <LoginPanelFrame>
      <p className="mb-5 text-sm leading-relaxed text-cream-muted">
        新しいパスワードを入力してください。
      </p>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <div>
          <label htmlFor="reset-password" className="mb-1.5 block text-xs text-cream-muted">
            新しいパスワード（6文字以上）
          </label>
          <input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="reset-password-confirm" className="mb-1.5 block text-xs text-cream-muted">
            新しいパスワード（確認）
          </label>
          <input
            id="reset-password-confirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={pending} className="btn-primary w-full min-h-11">
          {pending ? "更新中…" : "パスワードを更新"}
        </button>
      </form>
      {state.error && (
        <p className="mt-4 text-sm leading-relaxed text-red-300" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mt-4 text-sm leading-relaxed text-cream-muted" role="status">
          {state.success}
        </p>
      )}
    </LoginPanelFrame>
  );
}
