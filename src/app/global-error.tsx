"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#F7F5F0", color: "#171717", fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <main style={{ maxWidth: 560, margin: "20vh auto", padding: "0 24px" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6B6B66" }}>Vyhel</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 44, lineHeight: 1.05, margin: "16px 0" }}>
            Something went wrong.
          </h1>
          <p style={{ color: "#6B6B66" }}>Please try again in a moment.</p>
          <button
            onClick={reset}
            style={{ marginTop: 24, background: "#171717", color: "#fff", border: 0, borderRadius: 6, padding: "12px 20px", fontSize: 15, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
