// app/api/admin/polls/[slug]/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { commitFile, deleteFile, getFile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLLS_DIR = "data/polls";
const RESULTS_DIRS = ["data/polls-results", "data/poll-results"]; // try both
const ACTIVE_PTR = "data/active-poll.json";

function b64(s) {
  return Buffer.from(s, "utf8").toString("base64");
}

// PATCH { action: "activate" | "deactivate" }
export async function PATCH(request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params;
  const { action } = (await request.json().catch(() => ({}))) || {};
  if (!action || !["activate", "deactivate"].includes(action)) {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  try {
    if (action === "activate") {
      // ensure poll exists first
      const file = await getFile(`${POLLS_DIR}/${slug}.json`);
      if (!file) {
        return NextResponse.json({ ok: false, error: "Poll not found" }, { status: 404 });
      }
      await commitFile({
        path: ACTIVE_PTR,
        contentBase64: b64(JSON.stringify({ slug }, null, 2)),
        message: `activate poll: ${slug}`,
      });
      return NextResponse.json({ ok: true, active: slug });
    } else {
      // deactivate: remove the pointer file if it points to this slug; else just delete pointer anyway
      try {
        await deleteFile({ path: ACTIVE_PTR, message: `deactivate poll: ${slug}` });
      } catch {
        // ignore if not found
      }
      return NextResponse.json({ ok: true, active: null });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// DELETE -> remove poll file and any results files. If active, also clear pointer.
export async function DELETE(_request, { params }) {
  const denied = requireAdmin();
  if (denied) return denied;

  const { slug } = params;

  try {
    // delete poll JSON
    await deleteFile({ path: `${POLLS_DIR}/${slug}.json`, message: `poll: delete ${slug}` })
      .catch(() => {}); // ignore if already gone

    // delete results JSON if present
    await Promise.all(
      RESULTS_DIRS.map((dir) =>
        deleteFile({ path: `${dir}/${slug}.json`, message: `poll: delete results ${slug}` })
          .catch(() => {})
      )
    );

    // if active pointer exists, drop it
    await deleteFile({ path: ACTIVE_PTR, message: `deactivate poll: ${slug}` }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
