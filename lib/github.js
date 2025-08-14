const API = "https://api.github.com";

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function commitFile({ path, content, message }) {
  const token  = must("GITHUB_TOKEN");         // classic token or fine-grained with contents:write
  const repo   = must("GITHUB_REPO");          // e.g. "chahalltek/nextjs-boilerplate"
  const branch = process.env.GITHUB_BRANCH || "main";

  const url = `${API}/repos/${repo}/contents/${encodeURIComponent(path)}`;
  const body = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
  };

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub commit failed ${res.status}: ${txt}`);
  }
  return res.json();
}
