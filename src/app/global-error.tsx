"use client";

/** Last-resort boundary for errors in the root layout itself. Self-contained: no app styles are guaranteed here. */
export default function GlobalError({
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
          fontFamily: "system-ui, sans-serif",
          background: "#f8f4eb",
          color: "#202c37",
        }}
      >
        <main
          style={{ maxWidth: 480, margin: "0 auto", padding: "6rem 1.5rem", textAlign: "center" }}
        >
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2.2rem" }}>
            Oops. That&rsquo;s on us.
          </h1>
          <p style={{ lineHeight: 1.6 }}>
            Something went wrong loading the site. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.8rem 1.6rem",
              borderRadius: 999,
              border: 0,
              background: "#fa6b4a",
              color: "#202c37",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
