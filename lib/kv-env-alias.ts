// lib/kv-env-alias.ts
// Side-effect module: map SURVIVOR_KV_* -> KV_* so @vercel/kv can read them.
const map = (from: string, to: string) => {
  if (!process.env[to] && process.env[from]) {
    process.env[to] = process.env[from]!;
  }
};

map("SURVIVOR_KV_REST_URL", "KV_REST_API_URL");
map("SURVIVOR_KV_REST_TOKEN", "KV_REST_API_TOKEN");
map("SURVIVOR_KV_REST_TOKEN_RO", "KV_REST_API_READ_ONLY_TOKEN");
map("SURVIVOR_KV_URL", "KV_URL");

export {}; // keep this a module
