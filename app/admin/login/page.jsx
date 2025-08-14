// app/admin/login/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminLogin() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [next, setNext] = useState("/admin");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const n = sp.get("next");
      if (n) setNext(n);
    }
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ user, pass }),
    });
    if (res.ok) {
      router.replace(next || "/admin");
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error || `Login failed (${res.status})`);
    }
  }

  return (
    <div className="container py-16 max-w-md">
      <h1 className="text-3xl font-bold">Admin Login</h1>
      <p className="text-white/70 mt-2">Enter your credentials to continue.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm text-white/70">Username</label>
          <input className="input w-full mt-1" value={user} onChange={(e) => setUser(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-white/70">Password</label>
          <input type="password" className="input w-full mt-1" value={pass} onChange={(e) => setPass(e.target.value)} />
        </div>
        <button className="btn-gold">Sign in</button>
        {msg && <div className="text-red-400 text-sm">{msg}</div>}
      </form>
    </div>
  );
}
