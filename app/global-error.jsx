// app/global-error.jsx
"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body style={{ padding: 24 }}>
        <h1>Something went wrong</h1>
        <p style={{ opacity: 0.7 }}>Try again or go back.</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#eee", padding: 12, borderRadius: 8 }}>
          {String(error?.stack || error)}
        </pre>
        <button onClick={() => reset()}>Retry</button>
      </body>
    </html>
  );
}
