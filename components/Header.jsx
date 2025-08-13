import Link from "next/link";
import Logo from "@/components/Logo";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-[color:var(--skol-nav)]/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-semibold text-white">The Skol Sisters</span>
        </Link>
        {/* ...the rest of your nav... */}
      </div>
    </header>
  );
}
