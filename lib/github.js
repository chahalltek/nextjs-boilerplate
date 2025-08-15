// lib/github.js
import { Octokit } from "@octokit/rest";

const token = process.env.GITHUB_TOKEN;
const repoStr = process.env.GITHUB_REPO;           // e.g. "chahalltek/nextjs-boilerplate"
const branch = process.env.GITHUB_BRANCH || "main";
const authorName  = process.env.GITHUB_AUTHOR_NAME  || "Skol Sisters Bot";
const authorEmail = process.env.GITHUB_AUTHOR_EMAIL || "bot@theskolsisters.com";

if (!token)   console.error("[github] GITHUB_TOKEN is missing");
if (!repoStr) console.error("[github] GITHUB_REPO is missing");

const octokit = token ? new Octokit({ auth: token }) : null;

function ownerRepo() {
  if (!repoStr || !repoStr.includes("/")) {
    throw new Error("GITHUB_REPO must be in the form 'owner/repo'");
  }
  const [owner, repo] = repoStr.split("/");
  return { owner, repo };
}

function toB64(content) {
  if (Buffer.isBuffer(content)) return content.toString("base64");
  return Buffer.from(String(content), "utf8").toString("base64");
}

function ghErr(err, verb) {
  const status = err?.status;
  const msg = err?.response?.data?.message || err?.message || "Unknown";
  console.error(`[github] ${verb} error`, status, msg, err?.response?.data);
  return new Error(`GitHub ${verb} failed: ${status ?? ""} ${msg}`);
}

export async function getFile(path) {
  const { owner, repo } = ownerRepo();
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (Array.isArray(data)) throw new Error("Path is a directory");
    return { sha: data.sha, content: Buffer.from(data.content, "base64").toString("utf8") };
  } catch (err) {
    if (err?.status === 404) return null;
    throw ghErr(err, "getFile");
  }
}

export async function commitFile({ path, content, message }) {
  const { owner, repo } = ownerRepo();
  let sha;
  try {
    const existing = await getFile(path);
    sha = existing?.sha;
  } catch (e) {
    // non-404 will be thrown by getFile already
  }
  try {
    const res = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: message || `Update ${path}`,
      content: toB64(content),
      branch,
      sha,
      committer: { name: authorName, email: authorEmail },
      author:    { name: authorName, email: authorEmail },
    });
    return { ok: true, sha: res.data.content?.sha };
  } catch (err) {
    throw ghErr(err, "commit");
  }
}

export async function deleteFile(path, message) {
  const { owner, repo } = ownerRepo();
  try {
    const file = await getFile(path);
    if (!file) return { ok: true, deleted: false };
    await octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message: message || `Delete ${path}`,
      branch,
      sha: file.sha,
      committer: { name: authorName, email: authorEmail },
      author:    { name: authorName, email: authorEmail },
    });
    return { ok: true, deleted: true };
  } catch (err) {
    throw ghErr(err, "delete");
  }
}
