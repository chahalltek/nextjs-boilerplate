// app/admin/login/page.jsx
export const dynamic = "force-dynamic";

export default function AdminLogin({ searchParams }) {
  const err = searchParams?.error;
  const message =
    err === "invalid" ? "Invalid username or password"
    : err === "missing" ? "Missing credentials"
    : err ? "Unauthorized" : "";

  return (
    <div className="container py-12 max-w-xl">
      <h1 className="text-4xl font-bold mb-6">Admin Login</h1>

      {message ? (
        <p className="mb-4 text-red-400">Unauthorized: {message}</p>
      ) : null}

      <form method="POST" action="/api/admin/login" className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Username</label>
          <input
            name="user"
            className="w-full input"
            placeholder="admin"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            name="pass"
            type="password"
            className="w-full input"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" className="btn-gold">Sign in</button>
      </form>
    </div>
  );
}
