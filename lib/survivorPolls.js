// lib/survivorPolls.js
import fs from "node:fs";
import path from "node:path";

const POLLS_DIR = path.join(process.cwd(), "content", "polls");

// Safely read a file (return null on any error)
function safeRead(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}

function loadFromDisk() {
  if (!fs.existsSync(POLLS_DIR)) return [];
  const files = fs.readdirSync(POLLS_DIR).filter(f => f.endsWith(".json"));
  const items = [];
  for (const f of files) {
    const raw = safeRead(path.join(POLLS_DIR, f));
    if (!raw) continue;
    try {
      const json = JSON.parse(raw);
      // default slug from filename if missing
      const slug = json.slug || f.replace(/\.json$/i, "");
      // skip drafts if marked
      if (json.draft === true || json.published === false) continue;
      items.push({ slug, ...json });
    } catch { /* ignore bad json */ }
  }
  return items;
}

// Fallback data so the page still works if no files exist yet
const FALLBACK = [
  {
    slug: "best-blindside-ever",
    question: "Best blindside ever?",
    options: [
      { id: "ozzy", label: "Ozzy (Micronesia)" },
      { id: "jt", label: "JT’s idol letter" },
      { id: "erik", label: "Erik gives up immunity" },
      { id: "sarah", label: "Sarah (Game Changers)" }
    ],
    blurb: "We’ve all yelled at the TV. Which move lives rent-free in your head?"
  }
];

export function getAllPolls() {
  const disk = loadFromDisk();
  return disk.length ? disk : FALLBACK;
}

export function getPollBySlug(slug) {
  return getAllPolls().find(p => p.slug === slug);
}
