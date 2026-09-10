import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../../bleaklogo1.png";
import creditCardsData from "../../public/data/credit_cards.json";
import DonateButton from "../../components/DonateButton";
import ChartInfoButtons from "../../components/ChartInfoButtons";
import { ChartPageTitle } from "../../components/LatestDataStamp";
import DataGradeSection from "../../components/DataGradeSection";
import CreditCardsChart from "./CreditCardsChart";

type CreditCardsData = {
  title?: string;
  latest?: number | null;
  latest_adjusted?: number | null;
  base_date?: string | null;
  updated_at?: string;
  observations?: Array<{
    date: string;
    value: number;
    nominal?: number | null;
    adjusted?: number | null;
    m2?: number | null;
  }>;
  recessions?: Array<{ start: string; end: string }>;
  summary?: string;
  papers?: Array<{ title: string; url: string }>;
};

const data = creditCardsData as CreditCardsData;

export default function CreditCardsPage() {
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
          <ChartPageTitle title="Credit Card Debt" />
          <ChartInfoButtons
            summary={
              data.summary ??
              "What households owe on bank credit cards. The orange line holds that pile still against M2 growth."
            }
            papers={data.papers ?? []}
          />
        </div>
        <div className="mt-8">
          <CreditCardsChart
            observations={data.observations ?? []}
            recessions={data.recessions ?? []}
            latest={typeof data.latest === "number" ? data.latest : null}
            latestAdjusted={typeof data.latest_adjusted === "number" ? data.latest_adjusted : null}
            baseDate={data.base_date ?? null}
            updatedAt={data.updated_at ?? null}
          />
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
          White is the actual dollar balance. Orange is the same balance after stripping out M2 growth from
          {data.base_date ? " " + data.base_date : " the first print"}. If the two grow together, orange stays flat.
          The 2010 jump is mostly accounting (card loans coming back onto bank books), not a sudden binge.
        </p>

        <div className="mt-6">
          <DataGradeSection
            items={[
              {
                label: "Credit card loans",
                grade: "C",
                description:
                  "Weekly bank balance-sheet total from the Fed H.8. Seasonally adjusted and revised. Not a market price.",
              },
              {
                label: "M2-adjusted line",
                grade: "C",
                description:
                  "Built from monthly M2 interpolated onto the weekly loan prints. Useful as a comparison, not a traded number.",
              },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
