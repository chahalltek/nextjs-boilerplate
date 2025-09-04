"use server";

type SendArgs = { subject: string; html: string };
type ScheduleArgs = { subject: string; html: string; scheduleAt: string };

const base =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

async function post(path: string, body: any) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ADMIN_API_KEY || ""}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

export async function dryRunSend(args: SendArgs) {
  return post(`/api/admin/newsletter/send?dry=1`, args);
}

export async function sendNow(args: SendArgs) {
  return post(`/api/admin/newsletter/send`, args);
}

export async function scheduleSend(args: ScheduleArgs) {
  return post(`/api/admin/newsletter/send`, args);
}
