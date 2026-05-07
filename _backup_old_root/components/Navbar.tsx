import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/charts", label: "Charts" },
];

export default function Navbar() {
  return (
    <header className="border-b border-neutral-900 bg-black/90">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-bold uppercase tracking-wide text-white">
          Macro Dashboard
        </Link>
        <div className="flex items-center gap-5 text-sm text-neutral-400">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
