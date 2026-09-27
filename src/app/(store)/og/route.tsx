/**
 * Dynamic OG image — branded 1200×630 card for social previews.
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0B0B",
          color: "#FBFBFB",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="14" stroke="#FBFBFB" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="5.5" fill="#FBFBFB" />
          <ellipse cx="32" cy="32" rx="26" ry="10" stroke="#FBFBFB" strokeWidth="1.6" transform="rotate(-24 32 32)" />
          <ellipse cx="32" cy="32" rx="26" ry="10" stroke="#FBFBFB" strokeWidth="1.6" transform="rotate(38 32 32)" opacity="0.55" />
        </svg>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, letterSpacing: "-0.04em", marginTop: 24, textTransform: "uppercase" }}>
          Rohde
        </div>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: "0.35em", textTransform: "uppercase", color: "#8C8C8C", marginTop: 12 }}>
          Objects of Orbit
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
