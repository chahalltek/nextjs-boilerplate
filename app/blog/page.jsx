import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = {
  title: "Blog — Skol Sisters",
  description: "Fantasy football strategy, Start/Sit tiers, Waiver Wire gems, and Survivor talk."
};

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <div className="container py-12">
      <h1 className="text-3xl md:text-4xl font-bold">Blog</h1>
      <p className="text-white/80 mt-2">Waivers, trades, tiers, and Survivor talk.</p>

      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((p) => (
          <article key={p.slug} className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="font-semibold text-lg">
              <Link href={`/blog/${p.slug}`} className="hover:underline">{p.title}</Link>
            </h2>
            {p.date && <p className="text-white/60 text-sm mt-1">{new Date(p.date).toLocaleDateString()}</p>}
            {p.excerpt && <p className="text-white/80 mt-3">{p.excerpt}</p>}
            <Link href={`/blog/${p.slug}`} className="inline-block mt-4 px-3 py-2 border border-white/20 rounded hover:bg-white/10">Read</Link>
          </article>
        ))}
      </div>
    </div>
  );
}