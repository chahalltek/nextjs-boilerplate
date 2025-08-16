// lib/github.js
// Lightweight GitHub Contents API wrapper using fetch (no Octokit needed)

const GH_REPO   = process.env.GH_REPO;                         // e.g. "chahalltek/nextjs-boilerplate"
const GH_BRANCH = process.env.GH_BRANCH || "main";
const GH_TOKEN  = process.env.GITHUB_TOKEN || process.env.GH_TOKEN; // classic or fine-grained with Contents:read/write

function assertEnv() {
  if (!GH_REPO)  throw new Error("Missing GH_REPO env var (owner/repo)");
  if (!GH_TOKEN) throw new Error("Missing GITHUB_TOKEN (or GH_TOKEN) env var");
}

function encPath(p) {
  return p.split("/").map(encodeURIComponent).join("/");
}

function ghHeaders() {
  return {
    Authorization: `token ${GH_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "skolsisters-admin",
  };
}

async function getFileSha(path) {
  assertEnv();
  const [owner, repo] = GH_REPO.split("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encPath(path)}?ref=${encodeURIComponent(GH_BRANCH)}`;
  const r = await fetch(url, { headers: ghHeaders() });

  if (r.status === 404) return null;
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`GitHub get failed ${r.status}: ${txt}`);
  }
  const j = await r.json();
  return j.sha || null;
}

/** Read a single file. Returns { contentBase64, sha } or null if 404. */
export async function getFile(path) {
  assertEnv();
  const [owner, repo] = GH_REPO.split("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encPath(path)}?ref=${encodeURIComponent(GH_BRANCH)}`;
  const r = await fetch(url, { headers: ghHeaders() });

  if (r.status === 404) return null;
  const txt = await r.text();
  let j;
  try { j = JSON.parse(txt); } catch { throw new Error(`GitHub get parse error: ${txt}`); }

  if (!r.ok) throw new Error(`GitHub get failed ${r.status}: ${j.message || txt}`);

  const contentBase64 = typeof j.content === "string" ? j.content.replace(/\n/g, "") : "";
  return { contentBase64, sha: j.sha || null };
}

export async function listDir(path) {
  assertEnv();
  const [owner, repo] = GH_REPO.split("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encPath(path)}?ref=${encodeURIComponent(GH_BRANCH)}`;
  const r = await fetch(url, { headers: ghHeaders() });
  if (r.status === 404) return []; // directory not there yet
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { throw new Error(`GitHub dir parse error: ${txt}`); }
  if (!Array.isArray(j)) throw new Error(`listDir expected array, got ${typeof j}`);
  return j; // [{name, path, sha, type: "file"|"dir", ...}, ...]
}

/** List a directory. Returns array of { name, path, type, sha, size } */
export async function listDir(path) {
  assertEnv();
  const [owner, repo] = GH_REPO.split("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encPath(path)}?ref=${encodeURIComponent(GH_BRANCH)}`;
  const r = await fetch(url, { headers: ghHeaders() });

  if (r.status === 404) return [];
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { throw new Error(`GitHub list parse error: ${txt}`); }
  if (!Array.isArray(j)) return [];
  return j.map(({ name, path: p, type, sha, size }) => ({ name, path: p, type, sha, size }));
}

/** Create or update a file. params: { path, contentBase64, message, sha? } */
export async function commitFile({ path, contentBase64, message, sha }) {
  assertEnv();
  const [owner, repo] = GH_REPO.split("/");
  const existingSha = sha ?? (await getFileSha(path));
  const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encPath(path)}`;
  const body = {
    message: message || `chore(admin): update ${path}`,
    content: contentBase64,
    branch: GH_BRANCH,
    ...(existingSha ? { sha: existingSha } : {}),
  };

  const r = await fetch(putUrl, { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { j = { raw: txt }; }

  if (!r.ok) throw new Error(`GitHub put failed ${r.status}: ${j.message || txt}`);
  return { ok: true, commit: j.commit?.sha, path, branch: GH_BRANCH };
}

/** Delete a file. params: { path, message } */
export async function deleteFile({ path, message }) {
  assertEnv();
  const [owner, repo] = GH_REPO.split("/");
  const sha = await getFileSha(path);
  if (!sha) throw new Error(`deleteFile: ${path} not found`);

  const delUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encPath(path)}`;
  const body = { message: message || `chore(admin): delete ${path}`, sha, branch: GH_BRANCH };

  const r = await fetch(delUrl, { method: "DELETE", headers: ghHeaders(), body: JSON.stringify(body) });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { j = { raw: txt }; }

  if (!r.ok) throw new Error(`GitHub delete failed ${r.status}: ${j.message || txt}`);
  return { ok: true, commit: j.commit?.sha, path, branch: GH_BRANCH };
}
