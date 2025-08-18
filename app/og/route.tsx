import { ImageResponse } from "next/og";

export const runtime = "edge";
export const revalidate = 60 * 60 * 24; // 1 day

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Hey Skol Sister";
  const cover = searchParams.get("cover");

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          background: "#120F1E",
          color: "white",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
          position: "relative",
        }}
      >

        {cover && (
          <img
            src={cover}
            style={{ position: "absolute", inset: 0, objectFit: "cover", opacity: 0.3 }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1000 }}>
          <div style={{ fontSize: 64, fontWeight: 800 }}>{title}</div>
         <div style={{ fontSize: 28, opacity: 0.75 }}>Hey Skol Sister</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
