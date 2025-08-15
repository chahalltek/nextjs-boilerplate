// app/api/admin/polls/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLLS_DIR = "data/polls";
const ACTIVE_PTR = "data/active-poll.json";

// --- small local helpers to list directory via GitHub Contents API ---
const GH_REPO   = process.env.GH_REPO;
const GH_BRANCH = process.env.GH_BRANCH || "main";
const GH_TOKEN  = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

function encPath(p) { return p.split("/").map(encodeURIComponent).join("/"); }
function ghHeaders() {
  return {
    Authorization: `token ${GH_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "skolsisters-admin",
  };
}
async function listDir(dirPath) {
  if (!GH_REPO || !GH_TOKEN) throw new Error("Missing GH_REPO or GITHUB_TOKEN env var");
  const [owner, repo] = GH_REPO.split("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encPath(dirPath)}?ref=${encodeURIComponent(GH_BRANCH)}`;
  const r = await fetch(url, { headers: ghHeaders() });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`GitHub list failed ${r.status}: ${await r.text()}`);
  const j = await r.json();
  if (!Array.isArray(j)) return [];
  return j
    .filter((it) => it.type === "file" && it.name.endsWith(".json"))
    .map((it) => ({ name: it.name, path: it.path }));
}

// GET -> list polls and report which one is active
export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;

  try {
    const files = await listDir(POLLS_DIR);
    const polls = files.map((f) => ({ slug: f.name.replace(/\.json$/, "") }));

    let activeSlug = null;
    const ptr = await getFile(ACTIVE_PTR).catch(() => null);
    if (ptr?.contentBase64) {
      const txt = Buffer.from(ptr.contentBase64, "base64").toString("utf8");
      try {
        const j = JSON.parse(txt);
        if (j && typeof j.slug === "string") activeSlug = j.slug;
      } catch {}
    }

    // Mark which is active
    const withActive = polls.map((p) => ({ ...p, active: p.slug === activeSlug }));
    return NextResponse.json({ ok: true, polls: withActive, activeSlug });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// POST -> create poll JSON and (optionally) make it active
export async function POST(request) {
  const denied = requireAdmin();
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const { slug, question, options, active, closesAt } = body || {};

  if (!slug || !question || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const poll = {
    slug,
    question,
    options,
    active: !!active,
    closesAt: closesAt || null,
    createdAt: new Date().toISOString(),
  };

  try {
    // Save poll JSON
    const json = JSON.stringify(poll, null, 2);
    const base64 = Buffer.from(json, "utf8").toString("base64");
    const filePath = `${POLLS_DIR}/${slug}.json`;

    const gh = await commitFile({
      path: filePath,
      contentBase64: base64,
      message: `poll: ${slug}`,
    });

    // If marked active, write the pointer
    if (poll.active) {
      const ptr = JSON.stringify({ slug }, null, 2);
      await commitFile({
        path: ACTIVE_PTR,
        contentBase64: Buffer.from(ptr, "utf8").toString("base64"),
        message: `activate poll: ${slug}`,
      });
    }

    return NextResponse.json({ ok: true, commit: gh.commit });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
