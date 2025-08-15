// app/api/admin/polls/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getFile, createOrUpdateFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Adjust these to whatever your frontend reader uses
const POLLS_DIR = "data/polls";
const POLLS_INDEX = `${POLLS_DIR}/index.json`;

async function readJson(path, fallback) {
  const f = await getFile(path);
  if (!f) return fallback;
  try {
    return JSON.parse(f.content);
  } catch {
    return fallback;
  }
}

export async function POST(req) {
  const denied = requireAdmin?.(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { slug, question, options = [], active = false, closesAt = null } = body || {};

    if (!slug || !question || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { ok: false, error: "slug, question, and at least two options are required" },
        { status: 400 }
      );
    }

    const poll = {
      slug,
      question,
      options: options.map((o) => ({ label: o.label ?? o, votes: Number(o.votes ?? 0) })),
      active: Boolean(active),
      closesAt,
      updatedAt: new Date().toISOString(),
    };

    // 1) write the poll file
    const filePath = `${POLLS_DIR}/${slug}.json`;
    const res1 = await createOrUpdateFile(
      filePath,
      JSON.stringify(poll, null, 2),
      `feat(polls): upsert ${slug}`
    );

    // 2) update index (append or replace existing entry by slug)
    const index = await readJson(POLLS_INDEX, []);
    const idx = index.findIndex((p) => p.slug === slug);
    if (idx >= 0) {
      index[idx] = { slug, question, active, closesAt };
    } else {
      index.push({ slug, question, active, closesAt });
    }

    // ensure only one active poll if that's your rule:
    if (active) {
      for (const i of index) {
        if (i.slug !== slug) i.active = false;
      }
    }

    const res2 = await createOrUpdateFile(
      POLLS_INDEX,
      JSON.stringify(index, null, 2),
      `feat(polls): update index`
    );

    if (process.env.VERCEL_DEPLOY_HOOK_URL) {
      fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: "POST" }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      files: [
        { path: filePath, commit: res1?.sha || null },
        { path: POLLS_INDEX, commit: res2?.sha || null },
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
