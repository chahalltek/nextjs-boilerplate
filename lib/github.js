export async function createOrUpdateFile(path, contentBase64, message) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token || !repo) return { ok: False, status: 500, error: "missing-github-env" };

  // Fetch current sha if exists
  let sha;
  const head = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
  });
  if (head.ok) {
    const j = await head.json();
    sha = j.sha;
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, content: contentBase64, branch, sha })
  });

  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  return { ok: true };
}

export async function getFile(path) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
  });
  if (!res.ok) return null;
  const j = await res.json();
  if (!j.content) return null;
  const buf = Buffer.from(j.content, "base64");
  return buf.toString();
}

export async function listMarkdownIn(dir) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(dir)}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
  });
  if (!res.ok) return [];
  const arr = await res.json();
  return Array.isArray(arr) ? arr.filter(x => x.type === "file" && x.name.endsWith(".md")).map(x => x.name) : [];
}