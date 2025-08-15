// lib/github.js
// Lightweight GitHub Contents API wrapper using fetch (no Octokit needed)

const GH_REPO = process.env.GH_REPO;           // e.g. "chahalltek/nextjs-boilerplate"
const GH_BRANCH = process.env.GH_BRANCH || "main";
const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN; // either works

function encPath(p) {
  // Encode each segment but keep slashes
  return p.split("/").map(encodeURIComponent).join("/");
}

async function getFileSha(path) {
  const [owner, repo] = (GH_REPO || "").split("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encPath(path)}?ref=${encodeURIComponent(GH_BRANCH)}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `token ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "skolsisters-admin",
    },
  });
  if (r.status === 404) return null;
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`GitHub get failed ${r.status}: ${txt}`);
  }
  const j = await r.json();
  return j.sha || null;
}

export async function commitFile({ path, contentBase64, message }) {
  if (!GH_REPO || !GH_TOKEN) {
    throw new Error("Missing GH_REPO or GITHUB_TOKEN env var");
  }
  const [owner, repo] = GH_REPO.split("/");
  const sha = await getFileSha(path);
  const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encPath(path)}`;
  const body = {
    message: message || `chore(admin): update ${path}`,
    content: contentBase64,           // content goes in JSON BODY (not URL!)
    branch: GH_BRANCH,
    ...(sha ? { sha } : {}),
  };
  const r = await fetch(putUrl, {
    method: "PUT",
    headers: {
      Authorization: `token ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "skolsisters-admin",
    },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  let j;
  try { j = JSON.parse(txt); } catch { j = { raw: txt }; }
  if (!r.ok) {
    throw new Error(`GitHub put failed ${r.status}: ${j.message || txt}`);
  }
  return { ok: true, commit: j.commit?.sha, path, branch: GH_BRANCH };
}
