// app/api/admin/kv-snapshot/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { cookies, headers } from "next/headers";

export const runtime = "nodejs";
const ADMIN_COOKIE = "skol_admin";

async function readKey(key: string) {
  // Try to detect type and dump accordingly
  const type = await (kv as any).type?.(key).catch(() => "string"); // fallback
  switch (type) {
    case "set":
      return await kv.smembers(key);
    case "zset":
      // with scores
      return await kv.zrange(key, 0, -1, { withScores: true });
    case "hash":
      return await kv.hgetall(key);
    case "list":
      return await kv.lrange(key, 0, -1);
    default:
      return await kv.get(key);
  }
}

export async function GET() {
  const hasCookie = cookies().get(ADMIN_COOKIE)?.value;
  const cronKey = headers().get("x-cron-key");
  const allowCron = process.env.CRON_SECRET && cronKey === process.env.CRON_SECRET;
  if (!hasCookie && !allowCron) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const prefixes = (process.env.KV_SNAPSHOT_PREFIXES || "sv:,hef:,ss:")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const data: Record<string, any> = {};
  for (const prefix of prefixes) {
    const bucket: Record<string, any> = {};
    // scanIterator is provided by upstash client & supported by @vercel/kv
    for await (const key of (kv as any).scanIterator({ match: `${prefix}*`, count: 200 })) {
      try {
        bucket[key] = await readKey(key);
      } catch (e: any) {
        bucket[key] = { __error: e?.message || "read error" };
      }
    }
    data[prefix] = bucket;
  }

  const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const payload = { createdAt: new Date().toISOString(), prefixes, data };
  const backupKey = `backup:kv:${stamp}`;
  await kv.set(backupKey, payload);

  return NextResponse.json({ ok: true, key: backupKey, approxBytes: JSON.stringify(payload).length });
}
