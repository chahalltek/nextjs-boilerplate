import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-10 mt-16">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo size={24} />
          <span className="text-sm">© {new Date().getFullYear()} The Skol Sisters. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-3 text-white/70 text-sm">
          <Link href="/about" className="hover:opacity-80">About</Link>
          <Link href="/contact" className="hover:opacity-80">Contact</Link>
          <Link href="/sponsorships" className="hover:opacity-80">Sponsorships</Link>
          <a className="hover:opacity-80" href="https://theskolsisters.com">theskolsisters.com</a>
        </div>
      </div>
    </footer>
  );
}