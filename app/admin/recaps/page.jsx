// app/admin/recaps/page.jsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function RecapsAdminLanding() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-2xl font-bold mb-4">Weekly Recaps — Admin</h1>
      <p className="text-white/70">
        This is the placeholder for your Recaps admin. The route exists so you won’t get a 404.
        (You can wire the full UI here later.)
      </p>
      <div className="mt-6">
        <a
          href="/admin"
          className="inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold border border-white/20 text-white hover:bg-white/10"
        >
          ← Back to Admin Home
        </a>
      </div>
    </div>
  );
}
