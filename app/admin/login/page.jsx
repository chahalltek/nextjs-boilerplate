// app/admin/login/page.jsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Form() {
  const router = useRouter();
  const sp = useSearchParams();

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(sp.get("error") || "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || `Login failed (${res.status})`);
        setLoading(false);
        return;
      }
      router.push("/admin");     // go to dashboard
      router.refresh();          // ensure middleware sees the cookie immediately
    } catch (e) {
      setErr(String(e));
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-md py-16">
      <h1 className="text-4xl font-bold mb-6">Admin Login</h1>
      <p className="text-white/70 mb-8">Enter your credentials to continue.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Username</label>
          <input className="input w-full" value={user} onChange={(e) => setUser(e.target.value)} />
        </div>
        <div>
          <label className="block mb-1">Password</label>
          <input
            className="input w-full"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </div>
        <button className="btn-gold" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {err && <p className="mt-4 text-red-400">{err}</p>}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}
