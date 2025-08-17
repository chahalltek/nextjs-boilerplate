// app/api/admin/publish-sweeper/route.js
import { NextResponse } from "next/server";
import { listDir, getFile, commitFile } from "@/lib/github";
import matter from "gray-matter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Directories we sweep. Each entry defines:
 *  - dir: repo path
 *  - flag: front-matter boolean we respect ("draft" or "published")
 *  - shouldPublish(fm): returns true if this doc is pending & due
 *  - markPublished(fm): mutates a copy of front-matter to mark as live
 */
const SPACES = [
  // Blog posts use { draft: boolean, publishAt?: ISO }
  {
    key: "posts",
    dir: "content/posts",
    flag: "draft",
    shouldPublish: (fm, now) =>
      (fm.draft === true) &&
      fm.publishAt &&
      !Number.isNaN(Date.parse(fm.publishAt)) &&
      new Date(fm.publishAt) <= now,
    markPublished: (fm) => {
      const out = { ...fm, draft: false };
      if (!out.date && fm.publishAt) out.date = fm.publishAt.slice(0, 10);
      return out;
    },
  },
  // Weekly Recap uses { published: boolean, publishAt?: ISO }
  {
    key: "recaps",
    dir: "content/recaps",
    flag: "published",
    shouldPublish: (fm, now) =>
      (fm.published === false || fm.published === 0) &&
      fm.publishAt &&
      !Number.isNaN(Date.parse(fm.publishAt)) &&
      new Date(fm.publishAt) <= now,
    markPublished: (fm) => {
      const out = { ...fm, published: true };
      if (!out.date && fm.publishAt) out.date = fm.publishAt.slice(0, 10);
      return out;
    },
  },
  // Hold ’em / Fold ’em uses { published: boolean, publishAt?: ISO }
  {
    key: "holdem",
    dir: "content/holdem",
    flag: "published",
    shouldPublish: (fm, now) =>
      (fm.published === false || fm.published === 0) &&
      fm.publishAt &&
      !Number.isNaN(Date.parse(fm.publishAt)) &&
      new Date(fm.publishAt) <= now,
    markPublished: (fm) => {
      const out = { ...fm, published: true };
      if (!out.date && fm.publishAt) out.date = fm.publishAt.slice(0, 10);
      return out;
    },
  },
];

function toB64(s) {
  return Buffer.from(s, "utf8").toString("base64");
}

export async function GET(request) {
  // Allow only Vercel Cron (header is present) or non-prod local use.
  const isCron = !!request.headers.get("x-vercel-cron") || process.env.NODE_ENV !== "production";
  if (!isCron) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const touched = [];

  for (const space of SPACES) {
    const items = await listDir(space.dir);
    const files = items.filter((it) => it.type === "file" && it.name.endsWith(".md"));
    for (const f of files) {
      const file = await getFile(f.path);
      if (!file?.contentBase64) continue;
      const raw = Buffer.from(file.contentBase64, "base64").toString("utf8");
      const parsed = matter(raw);
      const fm = parsed.data || {};

      if (space.shouldPublish(fm, now)) {
        const newFm = space.markPublished(fm);
        const newMd = matter.stringify(parsed.content || "", newFm);
        const gh = await commitFile({
          path: f.path,
          contentBase64: toB64(newMd),
          message: `[sweeper] publish ${f.path}`,
        });
        touched.push({ path: f.path, commit: gh.commit });
      }
    }
  }

  return NextResponse.json({ ok: true, published: touched, at: now.toISOString() });
}
