// app/search/page.jsx
import nextDynamic from "next/dynamic";

export const runtime = "nodejs";
export const metadata = {
  title: "Search — Hey Skol Sister",
  description: "Search posts, Weekly Recaps, and Hold ’em / Fold ’em.",
};

const SearchClient = nextDynamic(() => import("./search-client"), { ssr: false });

export default function SearchPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-white/70">
          Find blog posts, Weekly Recaps, and Hold ’em / Fold ’em entries.
        </p>
      </header>

      <SearchClient />
    </div>
  );
}
