// app/api/admin/uploads/route.js
import { requireAdmin } from "@/lib/adminAuth";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const data = await request.formData();
  const file = data.get("file");
  if (!file || typeof file === "string") {
    return new Response(JSON.stringify({ ok: false, error: "No file" }), { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".bin";
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const rel = `public/uploads/${Date.now()}_${safeName}`;
  const abs = path.join(process.cwd(), rel);

  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, bytes);

  // public/ is served from /
  return Response.json({ ok: true, url: `/${rel.replace(/^public\//, "")}` });
}
