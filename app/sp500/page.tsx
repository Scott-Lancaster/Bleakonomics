import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../../bleaklogo1.png";
import sp500Data from "../../public/data/sp500.json";
import DonateButton from "../../components/DonateButton";
import ChartInfoButtons from "../../components/ChartInfoButtons";
import { ChartPageTitle } from "../../components/LatestDataStamp";
import DataGradeSection from "../../components/DataGradeSection";
import SP500Chart from "./SP500Chart";

type SP500Data = {
  title?: string;
  latest?: number | null;
  latest_gold_oz?: number | null;
  latest_ma200?: number | null;
  updated_at?: string;
  observations?: Array<{
    date: string;
    value?: number | null;
    spx?: number | null;
    ma200?: number | null;
    gold?: number | null;
    gold_oz?: number | null;
  }>;
  recessions?: Array<{ start: string; end: string }>;
  summary?: string;
  papers?: Array<{ title: string; url: string }>;
};

const data = sp500Data as SP500Data;

export default function SP500Page() {
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
          <ChartPageTitle title="S&P 500" />
          <ChartInfoButtons
            summary={
              data.summary ??
              "The white line is the S&P 500 in dollars. The gold line is that same index priced in ounces of gold."
            }
            papers={data.papers ?? []}
          />
        </div>
        <div className="mt-8">
          <SP500Chart
            observations={data.observations ?? []}
            recessions={data.recessions ?? []}
            latest={typeof data.latest === "number" ? data.latest : null}
            latestGoldOz={typeof data.latest_gold_oz === "number" ? data.latest_gold_oz : null}
            latestMa200={typeof data.latest_ma200 === "number" ? data.latest_ma200 : null}
            updatedAt={data.updated_at ?? null}
          />
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
          White is the S&P 500 in dollars. Gold is the same index divided by the dollar gold price.
          The dashed orange line is the 200-day moving average. Use the buttons above the chart to
          turn those extra lines off.
        </p>

        <div className="mt-6">
          <DataGradeSection
            items={[
              {
                label: "S&P 500",
                grade: "A",
                description:
                  "Market close, daily. Yahoo covers the long tape from 1978; FRED overwrites the recent window when it is newer.",
              },
              {
                label: "Gold / gold-priced",
                grade: "B",
                description:
                  "Monthly gold before August 2000, then COMEX futures, not the LBMA spot fix. Close enough to see the real-vs-metal story, not a bullion invoice.",
              },
              {
                label: "200-day moving average",
                grade: "A",
                description:
                  "Straight 200-session average of the dollar index. No special sauce. It needs 200 trading days before it prints.",
              },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
