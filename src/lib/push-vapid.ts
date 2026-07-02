import "server-only";

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim()
  );
}

export function getVapidPublicKey(): string | null {
  const key = process.env.VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

export function getVapidSubject(): string {
  return process.env.VAPID_SUBJECT?.trim() || "mailto:support@chuchoter-official.com";
}
