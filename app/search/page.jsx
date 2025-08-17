// app/search/page.jsx
import nextDynamic from "next/dynamic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search — Hey Skol Sister",
  description: "Find posts, weekly recaps, and more.",
};

// IMPORTANT: use an alias so we don't clash with the exported `dynamic` above
const SearchClient = nextDynamic(() => import("./search-client"), { ssr: false });

export default function SearchPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-white/70">Search blog posts and weekly recaps.</p>
      </header>

      <SearchClient />
    </div>
  );
}
