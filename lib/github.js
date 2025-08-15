// lib/github.js
import { Octokit } from "@octokit/rest";

const {
  GITHUB_TOKEN,
  GITHUB_REPO,   // e.g. "chahalltek/nextjs-boilerplate"
  GITHUB_BRANCH, // e.g. "main"
  GITHUB_AUTHOR_NAME,
  GITHUB_AUTHOR_EMAIL,
} = process.env;

function assertEnv() {
  if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");
  if (!GITHUB_REPO) throw new Error("Missing GITHUB_REPO");
}

function parseRepo(repoStr) {
  const [owner, repo] = String(repoStr).split("/");
  if (!owner || !repo) throw new Error(`Invalid GITHUB_REPO: "${repoStr}"`);
  return { owner, repo };
}

function getOctokit() {
  assertEnv();
  return new Octokit({
    auth: GITHUB_TOKEN,
    userAgent: "skol-sisters-admin",
  });
}

const DEFAULT_BRANCH = GITHUB_BRANCH || "main";

function toBase64(content) {
  return Buffer.isBuffer(content)
    ? content.toString("base64")
    : Buffer.from(String(content), "utf8").toString("base64");
}

/**
 * Fetch a file’s content + sha from the repo (or null if not found)
 */
export async function getFile(path) {
  assertEnv();
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(GITHUB_REPO);

  try {
    const res = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: DEFAULT_BRANCH,
    });

    // If it's a file, data is an object; if a directory, it’s an array
    if (Array.isArray(res.data)) {
      throw new Error(`Path "${path}" is a directory, expected a file`);
    }

    const sha = res.data.sha;
    const b64 = res.data.content || "";
    const content = Buffer.from(b64, "base64").toString("utf8");
    return { sha, content };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Create or update a file’s contents on the repo
 */
export async function createOrUpdateFile(
  path,
  content,
  message = "chore: update via admin"
) {
  assertEnv();
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(GITHUB_REPO);

  let sha;
  try {
    const existing = await getFile(path);
    sha = existing?.sha;
  } catch (e) {
    if (e.status !== 404) throw e;
  }

  const author =
    GITHUB_AUTHOR_NAME && GITHUB_AUTHOR_EMAIL
      ? { name: GITHUB_AUTHOR_NAME, email: GITHUB_AUTHOR_EMAIL }
      : undefined;

  const res = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: toBase64(content),
    branch: DEFAULT_BRANCH,
    ...(sha ? { sha } : {}),
    ...(author ? { committer: author, author } : {}),
  });

  return {
    ok: true,
    path,
    sha: res.data.content?.sha || res.data.commit?.sha,
  };
}

/**
 * Delete a file from the repo
 */
export async function deleteFile(
  path,
  message = "chore: delete via admin"
) {
  assertEnv();
  const octokit = getOctokit();
  const { owner, repo } = parseRepo(GITHUB_REPO);

  const existing = await getFile(path);
  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  const author =
    GITHUB_AUTHOR_NAME && GITHUB_AUTHOR_EMAIL
      ? { name: GITHUB_AUTHOR_NAME, email: GITHUB_AUTHOR_EMAIL }
      : undefined;

  await octokit.repos.deleteFile({
    owner,
    repo,
    path,
    message,
    sha: existing.sha,
    branch: DEFAULT_BRANCH,
    ...(author ? { committer: author, author } : {}),
  });

  return { ok: true, path };
}

// Back-compat if any route still imports commitFile
export const commitFile = createOrUpdateFile;

// Optional helper if a route needs it
export { parseRepo };
