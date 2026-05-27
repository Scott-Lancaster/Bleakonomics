import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../../bleaklogo1.png";
import yieldCurveData from "../../public/data/yield_curve.json";
import DonateButton from "../../components/DonateButton";
import ChartInfoButtons from "../../components/ChartInfoButtons";
import DataGradeSection from "../../components/DataGradeSection";
import YieldCurveChart from "./YieldCurveChart";

type YieldCurveData = {
  title?: string;
  latest?: number;
  updated_at?: string;
  observations?: Array<{ date: string; value: number }>;
  recessions?: Array<{ start: string; end: string }>;
  summary?: string;
  papers?: Array<{ title: string; url: string }>;
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
        <div className="flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
            10Y - 2Y Treasury Spread
          </h1>
          <ChartInfoButtons
            summary={
              data.summary ??
              "Negative spread equates to negative sentiment. Investors have more faith in the economy 2 years from now than 10 years from now."
            }
            papers={data.papers ?? []}
            brewsHref="/bleaks-brews#10-year-2-year-treasury-yields"
          />
        </div>
        <div className="mt-8">
          <YieldCurveChart
            observations={data.observations ?? []}
            recessions={data.recessions ?? []}
            latest={typeof data.latest === "number" ? data.latest : null}
            updatedAt={data.updated_at ?? null}
          />
        </div>

        <div className="mt-6">
          <DataGradeSection
            items={[
              {
                label: "Treasury Yields",
                grade: "A",
                description:
                  "Markets price these every day and the source updates once a day. As good as data gets.",
              },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
