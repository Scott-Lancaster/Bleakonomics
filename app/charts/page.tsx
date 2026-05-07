import ChartCard from "@/components/ChartCard";

const charts = [
  {
    title: "10Y - 2Y Treasury Yield Spread",
    image: "/charts/yield_curve.png",
    description:
      "A classic recession-risk signal comparing long-term and short-term Treasury yields.",
  },
];

export default function ChartsPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-white">Charts</h1>
        <p className="mt-3 max-w-2xl text-neutral-400">
          Generated market and macro charts with saved metadata in public data files.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {charts.map((chart) => (
            <ChartCard key={chart.title} {...chart} />
          ))}
        </div>
      </section>
    </main>
  );
}
