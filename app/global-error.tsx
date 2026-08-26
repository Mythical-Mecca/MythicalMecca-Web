"use client";

/**
 * Last resort: an error thrown in the root layout itself, where no other
 * boundary is mounted. It has to render its own <html>/<body>, so it can't use
 * the app's fonts or components — the styles are inline on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "1.5rem",
          background: "#0b0f1c",
          color: "#f1e7d3",
          fontFamily: "system-ui, -apple-system, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "26rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0, letterSpacing: "0.02em" }}>
            The hall is dark
          </h1>
          <p style={{ color: "#9aa3bd", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Something failed before the page could be built. Reloading usually
            clears it.
          </p>
          {error.digest && (
            <p style={{ color: "#9aa3bd", fontSize: "0.7rem", fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              minHeight: 44,
              padding: "0.6rem 1.4rem",
              borderRadius: 9999,
              border: 0,
              background: "#E18D01",
              color: "#160f0a",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
