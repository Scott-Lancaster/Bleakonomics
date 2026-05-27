import Image from "next/image";
import Link from "next/link";
import bleaksBrewsButton from "../../BleaksBrewsButton.png";
import bleaksBrewIntroduction from "../../BleaksBrewIntroduction.png";
import SiteHeader from "../../components/SiteHeader";

const sections = [
  {
    id: "introduction",
    title: "Introduction",
    placeholder: `This is Bleak. He’s a brewmaster, the owner of his own brewery, and a lifelong lover of quality beer. Bleak has been brewing since he was a cub, and over the years he has developed a pretty good feel for what makes a great batch. He runs a real business brewing and serving his beer, but he still makes sure to give some away to his friends.

Bleak’s purpose in life is simple: make the finest beer in the world for everyone to enjoy. This article uses Bleak’s everyday life in the brewery to explain the macroeconomic charts behind Bleakonomics. The analogy will not be perfect, but the goal is to make intimidating economic signals feel more intuitive, familiar, and maybe even a little fun.`,
  },
  {
    id: "10-year-2-year-treasury-yields",
    title: "10 Year - 2 Year Treasury Yields",
    placeholder: `Bleak brews all kinds of beer: crispy pilsners, fancy Kölsches, hazy IPAs, and dark stouts that look like they were forged deep inside a bear cave. Some batches are quick movers, the kind of beer everyone wants right now. Others take more patience, more planning, better ingredients, and maybe a few late nights spent staring into a fermentation tank like it holds the secrets of the universe.

After years of brewing, Bleak has developed a sixth sense for the beer world. He knows what customers are ordering, what ingredients cost, which styles are trending, and whether the regulars are saying things like, “I’ll take a growler to go,” or “Eh, maybe I’ll just have one.” He also knows that every batch depends on inputs: the quality of the hops, the strength of the yeast, the grain bill, the temperature, the aging time, and whether the whole brew is coming together cleanly or starting to taste a little weird.

Because Bleak knows his brewery so well, he can look at a batch before it ever hits the tap and make a pretty good guess at what it is worth. A quick pilsner made with solid ingredients and strong customer demand might command a good price today. A long-aging stout might depend more on what Bleak thinks the brewery, the customers, and the ingredient market will look like months from now. Every input changes the final “yield” of the beer: how much people want it, how much they are willing to pay, and whether the batch turns into profit or just a very expensive science experiment with foam.

That is similar to the 10-year minus 2-year Treasury yield. Like Bleak pricing his beer, the market takes in all the information it has — inflation, employment, growth, interest rates, risk, and overall economic vibes — and uses it to price short-term expectations against long-term expectations. When the 2-year yield moves above the 10-year yield, it is like Bleak deciding that the quick batch is more demanding, expensive, or valuable than the slow batch aging in the back. Something about the near-term brew is running hotter than the long-term outlook.`,
  },
  {
    id: "unemployment",
    title: "Unemployment",
    placeholder: `High unemployment means a higher percentage of people in the economy are not actively producing goods or services. In Bleak’s brewery, that is like having a higher percentage of his ingredients be stale, weak, or missing altogether.

Bleak still has customers to serve, so the brewery keeps running. But if the hops are stale, the yeast is lazy, the grain is low quality, or a few key ingredients never show up, the batch is going to suffer. He can still make beer, but it is harder to make good beer.

That is similar to unemployment. When more people are out of work, the economy has fewer productive inputs helping create value. The system can still produce, but the final product gets weaker. In Bleak’s world, high unemployment means too many bad or missing ingredients are going into the brew, which leads to flat, weird, and unprofitable batches.`,
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

              {section.id === "introduction" ? (
                <div className="mt-5">
                  <p className="text-base leading-6 text-neutral-300 italic">
                    The following is an analogy for to help simplify the macroeconomic picture. For all master brewers and economist, I apologize for all the innaccuracies
                  </p>
                  <Image
                    src={bleaksBrewIntroduction}
                    alt="Bleak's Brews introduction"
                    className="mx-auto mt-5 w-full rounded-lg border border-neutral-800 bg-neutral-950 object-cover md:w-2/3"
                    priority
                  />
                  <div className="mt-6 text-base leading-8 text-neutral-400">
                    <p className="whitespace-pre-line">{section.placeholder}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 whitespace-pre-line text-base leading-8 text-neutral-400">
                  {section.placeholder}
                </p>
              )}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
