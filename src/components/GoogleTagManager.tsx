import { GoogleTagManager as NextGoogleTagManager } from "@next/third-parties/google";

function getGtmId(): string | null {
  const id = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  if (!id) return null;
  if (process.env.NODE_ENV !== "production") return null;
  return id;
}

export default function GoogleTagManager() {
  const gtmId = getGtmId();
  if (!gtmId) return null;

  return <NextGoogleTagManager gtmId={gtmId} />;
}
