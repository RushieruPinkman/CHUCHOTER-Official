import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = SITE.ogImageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(145deg, #07070c 0%, #12121a 45%, #1a1510 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,169,98,0.18), transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 32,
            border: "1px solid rgba(201,169,98,0.35)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 72,
              letterSpacing: "0.18em",
              color: "#c9a962",
              fontWeight: 600,
            }}
          >
            {SITE.name}
          </div>
          <div
            style={{
              fontSize: 28,
              letterSpacing: "0.12em",
              color: "#d4cfc4",
            }}
          >
            高級隠れ家マンション
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 22,
              color: "rgba(212,207,196,0.75)",
              maxWidth: 900,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {SITE.tagline}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
