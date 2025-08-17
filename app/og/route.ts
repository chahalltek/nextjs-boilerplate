// app/og/route.js
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const title   = searchParams.get("t") || "Hey Skol Sister";
  const section = searchParams.get("s") || "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #120F1E 0%, #221C36 60%, #3a2f5f 100%)",
          color: "white",
          padding: "64px",
        }}
      >
        <div style={{ fontSize: 40, opacity: 0.85, marginBottom: 16 }}>
          {section ? section.toUpperCase() : "HEYSKOLSISTER.COM"}
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>
          {title}
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          Hey Skol Sister
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
