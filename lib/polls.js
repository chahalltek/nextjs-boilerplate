import fs from "node:fs";
import path from "node:path";

const POLLS_DIR = path.join(process.cwd(), "content", "polls");

export function getPoll(slug) {
  const file = path.join(POLLS_DIR, `${slug}.json`);
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  return { slug, ...data };
}

export function getOpenPoll() {
  if (!fs.existsSync(POLLS_DIR)) return null;
  const files = fs.readdirSync(POLLS_DIR).filter(f => f.endsWith(".json"));
  for (const f of files) {
    const raw = fs.readFileSync(path.join(POLLS_DIR, f), "utf8");
    const data = JSON.parse(raw);
    if (data.status === "open") {
      return { slug: f.replace(/\.json$/, ""), ...data };
    }
  }
  return null;
}
