import Link from "next/link";
import DonateButton from "./DonateButton";

type SiteHeaderProps = {
  active: "home" | "brews";
};

const tabs = [
  { href: "/", label: "Home", id: "home" },
  { href: "/bleaks-brews", label: "Bleak's Brews", id: "brews" },
] as const;

export default function SiteHeader({ active }: SiteHeaderProps) {
  return (
    <header className="border-b border-neutral-900 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <nav className="flex items-center gap-2 rounded-lg border border-neutral-900 bg-neutral-950 p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={
                "rounded-md px-4 py-2 text-sm font-semibold transition " +
                (active === tab.id
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white")
              }
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <DonateButton />
      </div>
    </header>
  );
}
