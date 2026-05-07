import ChartCard from "@/components/ChartCard";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Daily macro signals
        </p>
        <h1 className="max-w-3xl text-4xl font-bold text-white sm:text-5xl">
          Macro Dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
          Daily updated charts tracking the economy, markets, and risk.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <ChartCard
            title="10Y - 2Y Treasury Yield Spread"
            image="/charts/yield_curve.png"
            description="Tracks the spread between 10-year and 2-year U.S. Treasury yields."
            href="/charts"
          />
        </div>
      </section>
    </main>
  );
}
