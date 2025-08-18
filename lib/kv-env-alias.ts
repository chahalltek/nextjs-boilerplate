// lib/kv-env-alias.ts
function clean(v?: string) {
  if (!v) return v;
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function setIf(from: string, to: string) {
  const val = clean(process.env[from]);
  if (val && !process.env[to]) process.env[to] = val;
}

// Always sanitize the canonical keys
["KV_URL", "KV_REST_API_URL", "KV_REST_API_TOKEN", "KV_REST_API_READ_ONLY_TOKEN"]
  .forEach((k) => { const v = clean(process.env[k]); if (v) process.env[k] = v; });

// Map any alternate prefixes you currently have
setIf("KV_KV_URL", "KV_URL");
setIf("KV_KV_REST_API_URL", "KV_REST_API_URL");
setIf("KV_KV_REST_API_TOKEN", "KV_REST_API_TOKEN");
setIf("KV_KV_REST_API_READ_ONLY_TOKEN", "KV_REST_API_READ_ONLY_TOKEN");

// If you ever used these, keep them too:
setIf("SURVIVOR_KV_URL", "KV_URL");
setIf("SURVIVOR_KV_REST_URL", "KV_REST_API_URL");
setIf("SURVIVOR_KV_REST_TOKEN", "KV_REST_API_TOKEN");
setIf("SURVIVOR_KV_REST_TOKEN_RO", "KV_REST_API_READ_ONLY_TOKEN");

export {};
