import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";

function getGaMeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id) return null;
  if (process.env.NODE_ENV !== "production") return null;
  return id;
}

export default function GoogleAnalytics() {
  const gaId = getGaMeasurementId();
  if (!gaId) return null;

  return <NextGoogleAnalytics gaId={gaId} />;
}
