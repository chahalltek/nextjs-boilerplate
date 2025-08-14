// lib/github.js
const REPO   = process.env.GITHUB_REPO;     // e.g. "chahalltek/nextjs-boilerplate"
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN  = process.env.GITHUB_TOKEN;
const API    = "https://api.github.com";

function baseHeaders() {
  if (!TOKEN) throw new Error("GITHUB_TOKEN missing");
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function gh(path, init) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...baseHeaders(), ...(init?.headers || {}) },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { res, json };
}

export async function getFileSha(filepath) {
  try {
    const { res, json } = await gh(
      `/repos/${REPO}/contents/${encodeURIComponent(filepath)}?ref=${encodeURIComponent(BRANCH)}`,
      { method: "GET" }
    );
    if (res.status === 200 && json?.sha) return { ok: true, sha: json.sha };
    return { ok: false, status: res.status, error: json };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function createOrUpdateFile(filepath, base64Content, message) {
  if (!REPO || !TOKEN) return { ok: false, error: "Missing GITHUB_REPO or GITHUB_TOKEN" };

  const committer = {
    name:  process.env.GITHUB_COMMIT_NAME  || "Skol Sisters Bot",
    email: process.env.GITHUB_COMMIT_EMAIL || "bot@skolsisters.com",
  };

  let sha;
  const existing = await getFileSha(filepath);
  if (existing.ok) sha = existing.sha;

  try {
    const body = {
      message: message || `Update ${filepath}`,
      content: base64Content,
      branch:  BRANCH,
      committer,
      ...(sha ? { sha } : {}),
    };
    const { res, json } = await gh(
      `/repos/${REPO}/contents/${encodeURIComponent(filepath)}`,
      { method: "PUT", body: JSON.stringify(body) }
    );
    if (res.status === 200 || res.status === 201) return { ok: true, commit: json?.commit, content: json?.content };
    return { ok: false, status: res.status, error: json };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function deleteFile(filepath, message) {
  if (!REPO || !TOKEN) return { ok: false, error: "Missing GITHUB_REPO or GITHUB_TOKEN" };

  const existing = await getFileSha(filepath);
  if (!existing.ok) return { ok: false, error: "File not found for delete", details: existing };

  const committer = {
    name:  process.env.GITHUB_COMMIT_NAME  || "Skol Sisters Bot",
    email: process.env.GITHUB_COMMIT_EMAIL || "bot@skolsisters.com",
  };

  try {
    const body = {
      message: message || `Delete ${filepath}`,
      sha: existing.sha,
      branch: BRANCH,
      committer,
    };
    const { res, json } = await gh(
      `/repos/${REPO}/contents/${encodeURIComponent(filepath)}`,
      { method: "DELETE", body: JSON.stringify(body) }
    );
    if (res.status === 200) return { ok: true };
    return { ok: false, status: res.status, error: json };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}
