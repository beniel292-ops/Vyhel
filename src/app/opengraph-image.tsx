import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";

export const alt = "Vyhel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

/** Default social card, used whenever a page has no specific image. */
export default async function OpengraphImage() {
  // Razorpay review mode (docs/razorpay-review-mode.md) shows the digital-products line instead.
  const review = (await getSettings()).reviewMode;
  const [line1, line2, foot] = review
    ? ["Practical guides.", "Delivered instantly.", "Digital products made by Vyhel"]
    : ["Smart finds.", "Better buying decisions.", "Independent product discovery"];
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
          <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: -2 }}>{line1}</div>
          <div style={{ fontSize: 56, marginTop: 16, color: "#3A3A37" }}>{line2}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#6B6B66" }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#52634F" }} />
          {foot}
        </div>
      </div>
    ),
    size,
  );
}
