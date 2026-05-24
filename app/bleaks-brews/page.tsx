import Image from "next/image";
import Link from "next/link";
import bleaksBrewsButton from "../../BleaksBrewsButton.png";
import SiteHeader from "../../components/SiteHeader";

const sections = [
  {
    id: "introduction",
    title: "Introduction",
    placeholder:
      "Placeholder text for the Bleak's Brews introduction. Replace this with the opening notes when ready.",
  },
  {
    id: "10-year-2-year-treasury-yields",
    title: "10 Year - 2 Year Treasury Yields",
    placeholder:
      "Placeholder text for the 10Y - 2Y Treasury yield section. Add your chart notes, context, and eventual image tie-in here.",
  },
  {
    id: "unemployment",
    title: "Unemployment",
    placeholder:
      "Placeholder text for the unemployment section. Add your labor-market notes, chart context, and eventual image tie-in here.",
  },
];

export default function BleaksBrewsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeader active="brews" />

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <Image
            src={bleaksBrewsButton}
            alt="Bleak's Brews"
            className="h-20 w-20 object-contain"
            priority
          />
          <h1 className="mt-5 font-mono text-4xl font-bold tracking-wide text-white md:text-6xl">
            Bleak&apos;s Brews
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
            Notes, explanations, and plain-English context for the charts.
          </p>
        </div>

        <nav className="mt-10 flex flex-wrap justify-center gap-2 border-y border-neutral-900 py-4">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={"#" + section.id}
              className="rounded-md border border-neutral-800 px-3 py-2 text-sm font-semibold text-neutral-300 transition hover:border-neutral-600 hover:text-white"
            >
              {section.title}
            </Link>
          ))}
        </nav>

        <div className="mt-12 grid gap-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-mono text-2xl font-bold tracking-wide text-white">
                <Link href={"#" + section.id} className="hover:text-neutral-300">
                  {section.title}
                </Link>
              </h2>
              <p className="mt-4 text-base leading-8 text-neutral-400">
                {section.placeholder}
              </p>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
