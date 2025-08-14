// app/admin/page.jsx
export const dynamic = "force-dynamic";

export default function AdminHome() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Admin</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <a className="cta-card" href="/admin/posts">
          <div className="cta-title">Manage Blog Posts</div>
          <div className="cta-sub">Create, edit, upload images</div>
        </a>
        <a className="cta-card" href="/admin/polls">
          <div className="cta-title">Manage Polls</div>
          <div className="cta-sub">Create polls and options</div>
        </a>
      </div>
    </div>
  );
}
