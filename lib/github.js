// lib/github.js
export const runtime = "nodejs";

const API = "https://api.github.com";

function repoParts() {
  const repo = process.env.GITHUB_REPO || process.env.GH_REPO || "";
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error('GITHUB_REPO must be "owner/repo"');
  }
  return { owner, repo: name };
}

function ghHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  if (!token) throw new Error("Missing GITHUB_TOKEN");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

const branch = () => process.env.GITHUB_BRANCH || "main";

/** Read a file’s text + sha. Returns null if it doesn’t exist. */
export async function getFile(path, ref = branch()) {
  const { owner, repo } = repoParts();
  const url = new URL(
    `${API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`
  );
  if (ref) url.searchParams.set("ref", ref);

  const res = await fetch(url, { headers: ghHeaders(), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub getFile ${res.status} ${err.message || ""}`);
  }
  const json = await res.json();
  if (Array.isArray(json)) throw new Error("Path is a directory");
  const content =
    json.encoding === "base64"
      ? Buffer.from(json.content || "", "base64").toString("utf8")
      : json.content;
  return { sha: json.sha, content };
}

/** Create or update a file with a commit. If sha is provided, it updates. */
export async function createOrUpdateFile(
  path,
  content,
  message = `chore: update ${path}`,
  sha
) {
  const { owner, repo } = repoParts();
  const body = {
    message,
    content: Buffer.from(
      typeof content === "string" ? content : new Uint8Array(content)
    ).toString("base64"),
    branch: branch(),
    ...(sha ? { sha } : {}),
  };
  const name = process.env.GITHUB_COMMITTER_NAME;
  const email = process.env.GITHUB_COMMITTER_EMAIL;
  if (name && email) body.committer = { name, email };

  const res = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub update ${res.status} ${err.message || ""}`);
  }
  return res.json();
}

/** Delete a file (auto-fetches current sha). No-op if missing. */
export async function deleteFile(
  path,
  message = `chore: delete ${path}`
) {
  const { owner, repo } = repoParts();
  const existing = await getFile(path).catch(() => null);
  if (!existing) return { ok: true, skipped: "missing" };

  const body = {
    message,
    sha: existing.sha,
    branch: branch(),
  };
  const name = process.env.GITHUB_COMMITTER_NAME;
  const email = process.env.GITHUB_COMMITTER_EMAIL;
  if (name && email) body.committer = { name, email };

  const res = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    { method: "DELETE", headers: ghHeaders(), body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub delete ${res.status} ${err.message || ""}`);
  }
  return res.json();
}
