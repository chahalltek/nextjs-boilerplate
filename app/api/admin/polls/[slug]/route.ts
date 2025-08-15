// app/api/admin/polls/[slug]/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile, getFile, deleteFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Poll = {
  slug: string;
  question: string;
  options: string[];
  active: boolean;
  closesAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const POLLS_DIR = "data/polls";
const ACTIVE_PTR = "data/active-poll.json";

function jsonOK(data: unknown) {
  return NextResponse.json({ ok: true, ...(data as object) });
}
function jsonErr(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(_req: Request, { params }: { params: { slug?: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = params?.slug;
  if (!slug) return jsonErr("Missing slug");

  const path = `${POLLS_DIR}/${slug}.json`;
  try {
    const f = await getFile(path);
    if (!f) return jsonErr("Not found", 404);
    const raw = Buffer.from(f.contentBase64, "base64").toString("utf8");
    const poll = JSON.parse(raw) as Poll;
    return jsonOK({ poll });
  } catch (e: any) {
    return jsonErr(String(e?.message || e), 500);
  }
}

export async function PUT(req: Request, { params }: { params: { slug?: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = params?.slug;
  if (!slug) return jsonErr("Missing slug");

  let body: Partial<Poll> = {};
  try { body = await req.json(); } catch {}
  const { question, options, active, closesAt } = body;

  if (!question || !Array.isArray(options) || options.length < 2) {
    return jsonErr("Invalid payload: require question + at least 2 options");
  }

  const now = new Date().toISOString();
  const poll: Poll = {
    slug,
    question,
    options: options.map(String),
    active: !!active,
    closesAt: closesAt ?? null,
    updatedAt: now,
  };

  // If file exists, keep createdAt
  const existing = await getFile(`${POLLS_DIR}/${slug}.json`).catch(() => null);
  if (existing) {
    try {
      const prev = JSON.parse(Buffer.from(existing.contentBase64, "base64").toString("utf8")) as Poll;
      poll.createdAt = prev.createdAt || now;
    } catch {
      poll.createdAt = now;
    }
  } else {
    poll.createdAt = now;
  }

  try {
    const json = JSON.stringify(poll, null, 2);
    const base64 = Buffer.from(json, "utf8").toString("base64");

    const write = await commitFile({
      path: `${POLLS_DIR}/${slug}.json`,
      contentBase64: base64,
      message: `poll: ${slug}`,
    });

    // If marked active, update pointer
    if (poll.active) {
      const ptr = JSON.stringify({ slug }, null, 2);
      await commitFile({
        path: ACTIVE_PTR,
        contentBase64: Buffer.from(ptr, "utf8").toString("base64"),
        message: `activate poll: ${slug}`,
      });
    }

    return jsonOK({ commit: write.commit, poll });
  } catch (e: any) {
    return jsonErr(String(e?.message || e), 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: { slug?: string } }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const slug = params?.slug;
  if (!slug) return jsonErr("Missing slug");

  try {
    const del = await deleteFile({
      path: `${POLLS_DIR}/${slug}.json`,
      message: `delete poll: ${slug}`,
    });
    return jsonOK({ commit: del.commit });
  } catch (e: any) {
    return jsonErr(String(e?.message || e), 500);
  }
}
