"use client";

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#0B0B0B", color: "#FBFBFB", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px" }}>
          <p style={{ letterSpacing: "0.35em", fontSize: 11, textTransform: "uppercase", color: "#8C8C8C" }}>
            Error 500
          </p>
          <h1 style={{ fontSize: 40, textTransform: "uppercase", letterSpacing: "-0.04em", marginTop: 12 }}>
            Signal interrupted
          </h1>
          <p style={{ marginTop: 16, fontSize: 14, color: "#8C8C8C", maxWidth: 420 }}>
            A critical error occurred. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 32,
              background: "#FBFBFB",
              color: "#0B0B0B",
              border: "none",
              padding: "14px 32px",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: 16, fontSize: 11, color: "#8C8C8C" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
