import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../../bleaklogo1.png";
import m2Data from "../../public/data/m2.json";
import DonateButton from "../../components/DonateButton";
import ChartInfoButtons from "../../components/ChartInfoButtons";
import DataGradeSection from "../../components/DataGradeSection";
import M2Chart from "./M2Chart";

type M2Data = {
  title?: string;
  latest?: number;
  updated_at?: string;
  observations?: Array<{ date: string; value: number }>;
  recessions?: Array<{ start: string; end: string }>;
  summary?: string;
  papers?: Array<{ title: string; url: string }>;
  m2_pct_world_gdp?: number | null;
  m2_pct_us_gdp?: number | null;
  world_gdp_year?: number | null;
};

const data = m2Data as M2Data;

export default function M2Page() {
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
            US M2 Money Supply
          </h1>
          <ChartInfoButtons
            summary={
              data.summary ??
              "M2 is the pile of US dollars in cash, checking, savings, small CDs, and retail money-market funds."
            }
            papers={data.papers ?? []}
            brewsHref="/bleaks-brews#us-m2"
          />
        </div>
        <div className="mt-8">
          <M2Chart
            observations={data.observations ?? []}
            recessions={data.recessions ?? []}
            latest={typeof data.latest === "number" ? data.latest : null}
            updatedAt={data.updated_at ?? null}
          />
        </div>

        {typeof data.m2_pct_world_gdp === "number" ? (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
            Size check: US M2 is about {data.m2_pct_world_gdp}% of one year of world GDP
            {data.world_gdp_year ? ` (World Bank, ${data.world_gdp_year})` : ""}.
            {typeof data.m2_pct_us_gdp === "number"
              ? ` It is about ${data.m2_pct_us_gdp}% of US GDP. A stock of money next to a year's output — not a share of global M2.`
              : " A stock of money next to a year's output — not a share of global M2."}
          </p>
        ) : null}

        <div className="mt-6">
          <DataGradeSection
            items={[
              {
                label: "M2SL",
                grade: "C",
                description:
                  "Fed constructed aggregate, monthly, definition changed in 2020. Official, not a market price. Weight it lighter than daily market prints.",
              },
              {
                label: "World GDP comparison",
                grade: "C",
                description:
                  "World Bank annual GDP in current dollars, lagged. Fine as a size check. Do not treat it as a precise global-M2 share.",
              },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
