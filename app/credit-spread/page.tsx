import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../../bleaklogo1.png";
import creditSpreadData from "../../public/data/credit_spread.json";
import DonateButton from "../../components/DonateButton";
import ChartInfoButtons from "../../components/ChartInfoButtons";
import { ChartPageTitle } from "../../components/LatestDataStamp";
import DataGradeSection from "../../components/DataGradeSection";
import CreditSpreadChart from "./CreditSpreadChart";

type CreditSpreadData = {
  title?: string;
  latest?: number | null;
  latest_hy?: number | null;
  latest_baa?: number | null;
  updated_at?: string;
  observations?: Array<{
    date: string;
    value?: number | null;
    baa?: number | null;
    hy?: number | null;
  }>;
  recessions?: Array<{ start: string; end: string }>;
  summary?: string;
  papers?: Array<{ title: string; url: string }>;
};

const data = creditSpreadData as CreditSpreadData;

export default function CreditSpreadPage() {
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
          <ChartPageTitle title="High Yield Credit Spread" />
          <ChartInfoButtons
            summary={
              data.summary ??
              "Extra yield lenders demand to hold company debt instead of Treasuries. When it jumps, credit is getting tight."
            }
            papers={data.papers ?? []}
          />
        </div>
        <div className="mt-8">
          <CreditSpreadChart
            observations={data.observations ?? []}
            recessions={data.recessions ?? []}
            latest={typeof data.latest === "number" ? data.latest : null}
            latestHy={typeof data.latest_hy === "number" ? data.latest_hy : null}
            latestBaa={typeof data.latest_baa === "number" ? data.latest_baa : null}
            updatedAt={data.updated_at ?? null}
          />
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
          Orange is the junk-bond spread (ICE high-yield OAS). Silver is Moody&apos;s Baa minus the 10-year
          Treasury, which is what FRED still publishes all the way back. The ICE series was cut to a three-year
          window in 2026.
        </p>

        <div className="mt-6">
          <DataGradeSection
            items={[
              {
                label: "Baa − 10Y Treasury",
                grade: "A",
                description:
                  "Market yields, published daily. Moody's Baa is the lowest investment-grade bucket, not junk, but it is the long public credit-spread series.",
              },
              {
                label: "ICE High Yield OAS",
                grade: "A",
                description:
                  "Market-set junk spread. The print is good. The history on FRED is not — about three years as of 2026. Treat the orange line as a recent overlay.",
              },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
