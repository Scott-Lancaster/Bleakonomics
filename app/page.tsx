import Image from "next/image";
import Link from "next/link";
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

      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
        <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-white md:text-7xl">
          Macroeconomics
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
          Free & Open Sourced. Updated daily.
        </p>

        <section className="mt-14 border-t border-neutral-900 pt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
            First chart
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            10Y - 2Y Treasury Spread
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
            A recession-risk signal comparing long-term and short-term Treasury
            yields. Click the chart for the interactive view.
          </p>

          <Link
            href="/yield-curve"
            className="mt-6 block overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 transition hover:border-neutral-600"
            aria-label="Open interactive 10Y - 2Y Treasury Spread chart"
          >
            <img
              src="/charts/yield_curve.png"
              alt="10Y - 2Y Treasury Spread chart"
              className="aspect-[2/1] w-full bg-neutral-950 object-contain"
            />
          </Link>
        </section>
      </section>
    </main>
  );
}
