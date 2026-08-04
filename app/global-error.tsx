"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#EAF3FE",
          margin: 0,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #88BDF2",
            borderRadius: "0.75rem",
            padding: "2.5rem",
            maxWidth: "24rem",
            width: "100%",
            textAlign: "center",
          }}
        >
          <h1 style={{ color: "#384959", fontSize: "1.125rem", margin: 0 }}>
            Something went wrong
          </h1>
          <p
            style={{
              color: "#6A89A7",
              fontSize: "0.875rem",
              marginTop: "0.5rem",
            }}
          >
            A critical error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              background: "#384959",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
            type="button"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
