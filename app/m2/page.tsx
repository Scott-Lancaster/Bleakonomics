import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../../bleaklogo1.png";
import m2Data from "../../public/data/m2.json";
import DonateButton from "../../components/DonateButton";
import ChartInfoButtons from "../../components/ChartInfoButtons";
import { ChartPageTitle } from "../../components/LatestDataStamp";
import DataGradeSection from "../../components/DataGradeSection";
import M2Chart from "./M2Chart";

type M2Data = {
  title?: string;
  latest?: number;
  latest_yoy?: number | null;
  updated_at?: string;
  observations?: Array<{
    date: string;
    value: number;
    us?: number | null;
    europe?: number | null;
    china?: number | null;
    japan?: number | null;
    total?: number | null;
    yoy?: number | null;
  }>;
  recessions?: Array<{ start: string; end: string }>;
  summary?: string;
  papers?: Array<{ title: string; url: string }>;
  shares?: {
    us?: number | null;
    europe?: number | null;
    china?: number | null;
    japan?: number | null;
  };
  global_share_pct?: number | null;
  global_year?: number | null;
  global_m2_t?: number | null;
  four_region_at_global_year?: number | null;
};

const data = m2Data as M2Data;

export default function M2Page() {
  const shares = data.shares ?? {};
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
          <ChartPageTitle title="Money Supply" />
          <ChartInfoButtons
            summary={
              data.summary ??
              "US, Europe, China, and Japan money, converted into dollars. The orange line is the four-region total."
            }
            papers={data.papers ?? []}
          />
        </div>
        <div className="mt-8">
          <M2Chart
            observations={data.observations ?? []}
            recessions={data.recessions ?? []}
            latest={typeof data.latest === "number" ? data.latest : null}
            shares={shares}
            globalSharePct={typeof data.global_share_pct === "number" ? data.global_share_pct : null}
            globalYear={typeof data.global_year === "number" ? data.global_year : null}
            updatedAt={data.updated_at ?? null}
          />
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
          {typeof data.global_share_pct === "number" && typeof data.global_year === "number"
            ? `These four regions were about ${Math.round(data.global_share_pct)}% of World Bank global broad money in ${data.global_year}`
              + (typeof data.four_region_at_global_year === "number" && typeof data.global_m2_t === "number"
                ? ` ($${Math.round(data.four_region_at_global_year)}T of $${Math.round(data.global_m2_t)}T).`
                : ".")
              + " UK, India, and other EM make up most of the rest."
            : "This four-region total is a lower bound on global M2 (UK, India, and other EM are left out)."}
          {" "}
          Of the basket: China {shares.china ?? "—"}%, US {shares.us ?? "—"}%, Europe {shares.europe ?? "—"}%,
          Japan {shares.japan ?? "—"}%. FX moves the dollar lines even when local money is unchanged.
        </p>

        <div className="mt-6">
          <DataGradeSection
            items={[
              {
                label: "US M2 / euro-area M2",
                grade: "C",
                description:
                  "Official monthly aggregates, converted at month-end FX. Not market prices. Definitions are not identical across regions.",
              },
              {
                label: "China / Japan recent years",
                grade: "C",
                description:
                  "FRED monthly goes stale (China 2019, Japan late 2023). Later years use World Bank annual plus a PBOC May 2026 China print, interpolated. Treat the right edge as an estimate.",
              },
              {
                label: "Share of global money",
                grade: "C",
                description:
                  "World Bank world broad money (% of GDP) times world GDP, lined up with this four-region total in the same year. Annual, lagged, and not the same definition as Fed or ECB M2.",
              },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
