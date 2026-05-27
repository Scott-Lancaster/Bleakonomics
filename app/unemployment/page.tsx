import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../../bleaklogo1.png";
import unemploymentData from "../../public/data/unemployment.json";
import DonateButton from "../../components/DonateButton";
import ChartInfoButtons from "../../components/ChartInfoButtons";
import DataGradeSection from "../../components/DataGradeSection";
import UnemploymentChart from "./UnemploymentChart";

type UnemploymentData = {
  title?: string;
  latest?: number;
  updated_at?: string;
  observations?: Array<{
    date: string;
    value: number;
    sahm?: number | null;
    three_month_average?: number | null;
  }>;
  recessions?: Array<{ start: string; end: string }>;
  summary?: string;
  papers?: Array<{ title: string; url: string }>;
  sahm?: number;
  status?: string;
};

const data = unemploymentData as UnemploymentData;

export default function UnemploymentPage() {
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
            US Unemployment Rate
          </h1>
          <ChartInfoButtons
            summary={
              data.summary ??
              "The unemployment rate shows how much labor-market stress has reached workers, while the Sahm Rule tracks whether unemployment is rising quickly enough to confirm recession risk."
            }
            papers={data.papers ?? []}
            brewsHref="/bleaks-brews#unemployment"
          />
        </div>

        <div className="mt-8">
          <UnemploymentChart
            observations={data.observations ?? []}
            recessions={data.recessions ?? []}
            latest={typeof data.latest === "number" ? data.latest : null}
            sahm={typeof data.sahm === "number" ? data.sahm : null}
            status={data.status ?? null}
            updatedAt={data.updated_at ?? null}
          />
        </div>

        <div className="mt-6">
          <DataGradeSection
            items={[
              {
                label: "Unemployment Rate",
                grade: "C",
                description:
                  "BLS publishes this only once a month, and the numbers are often revised in the following months.",
              },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
