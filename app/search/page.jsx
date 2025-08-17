// app/search/page.jsx
import nextDynamic from "next/dynamic";

export const metadata = {
  title: "Search — Hey Skol Sister",
  description: "Find posts, weekly recaps, Hold ’em / Fold ’em, and polls.",
};

const SearchClient = nextDynamic(() => import("./search-client"), { ssr: false });

export default function SearchPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Search</h1>
      <p className="mt-2 text-white/70">
        Search across Blog, Weekly Recaps, Hold ’em / Fold ’em, and Survivor polls.
      </p>
      <div className="mt-6">
        <SearchClient />
      </div>
    </div>
  );
}
