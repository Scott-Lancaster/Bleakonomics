import Image from "next/image";
import bleakLogo from "../bleaklogo1.png";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="absolute left-6 top-6 flex items-center gap-3">
        <Image
          src={bleakLogo}
          alt="Bleakonomics logo"
          className="h-10 w-10 object-contain"
          priority
        />
        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">
          Bleakonomics
        </span>
      </header>

      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-white md:text-7xl">
          Macroeconomics, open for the people.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
          A daily-updated dashboard tracking the most important stuff. For
          everyone.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href="#charts"
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
          >
            View charts
          </a>

          <a
            href="#methodology"
            className="rounded-full border border-neutral-700 px-5 py-3 text-sm font-semibold text-white transition hover:border-neutral-400"
          >
            Methodology
          </a>
        </div>

        <div
          id="charts"
          className="mt-16 grid gap-4 border-t border-neutral-900 pt-8 md:grid-cols-3"
        >
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <p className="text-sm text-neutral-500">First chart</p>
            <h2 className="mt-2 text-xl font-semibold">
              10Y - 2Y Treasury Spread
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Coming soon: generated daily from your Python script.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <p className="text-sm text-neutral-500">Second chart</p>
            <h2 className="mt-2 text-xl font-semibold">
              Inflation Pressure
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              CPI, rates, and other inflation signals.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <p className="text-sm text-neutral-500">Third chart</p>
            <h2 className="mt-2 text-xl font-semibold">
              Liquidity Watch
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              M2, Fed balance sheet, and related liquidity indicators.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
