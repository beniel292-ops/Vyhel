import { ImageResponse } from "next/og";

export const alt = "Vyhel — Smart finds. Better buying decisions.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social card, used whenever a page has no specific image. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F7F5F0",
          padding: "72px 80px",
          color: "#171717",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 14, fontWeight: 600 }}>VYHEL</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: -2 }}>Smart finds.</div>
          <div style={{ fontSize: 56, marginTop: 16, color: "#3A3A37" }}>Better buying decisions.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#6B6B66" }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#52634F" }} />
          Independent product discovery
        </div>
      </div>
    ),
    size,
  );
}
