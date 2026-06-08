export const AUTH_MEMBER_UPDATED_EVENT = "chuchoter-auth-member-updated";

export type AuthMemberUpdatedDetail = {
  displayName: string;
};

export function dispatchAuthMemberUpdated(displayName: string): void {
  if (typeof window === "undefined") return;

  const trimmed = displayName.trim();
  if (!trimmed) return;

  window.dispatchEvent(
    new CustomEvent<AuthMemberUpdatedDetail>(AUTH_MEMBER_UPDATED_EVENT, {
      detail: { displayName: trimmed },
    })
  );
}

export function readAuthMemberUpdatedDisplayName(event: Event): string | null {
  const detail = (event as CustomEvent<AuthMemberUpdatedDetail>).detail;
  const trimmed = detail?.displayName?.trim();
  return trimmed || null;
}
