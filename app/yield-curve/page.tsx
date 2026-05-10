import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../../bleaklogo1.png";
import yieldCurveData from "../../public/data/yield_curve.json";
import DonateButton from "../../components/DonateButton";
import YieldCurveChart from "./YieldCurveChart";

type YieldCurveData = {
  title?: string;
  latest?: number;
  updated_at?: string;
  observations?: Array<{ date: string; value: number }>;
  recessions?: Array<{ start: string; end: string }>;
};

const data = yieldCurveData as YieldCurveData;

export default function YieldCurvePage() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={bleakLogo}
            alt="Bleakonomics logo"
            className="h-10 w-10 object-contain"
            priority
          />
          <span className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Bleakonomics
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <DonateButton />
          <Link href="/" className="text-sm font-semibold text-neutral-400 hover:text-white">
            Back
          </Link>
        </div>
      </header>

      <section className="mx-auto mt-14 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
          Interactive chart
        </p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-white md:text-6xl">
          10Y - 2Y Treasury Spread
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-neutral-400">
          Hover across the chart to inspect daily values. Use the range controls
          to move between recent history and the full data set.
        </p>

        <div className="mt-8">
          <YieldCurveChart
            observations={data.observations ?? []}
            recessions={data.recessions ?? []}
            latest={typeof data.latest === "number" ? data.latest : null}
            updatedAt={data.updated_at ?? null}
          />
        </div>
      </section>
    </main>
  );
}
