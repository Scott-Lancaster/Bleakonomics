import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../../bleaklogo1.png";
import usDebtData from "../../public/data/us_debt.json";
import DonateButton from "../../components/DonateButton";
import ChartInfoButtons from "../../components/ChartInfoButtons";
import DataGradeSection from "../../components/DataGradeSection";
import USDebtChart from "./USDebtChart";

type USDebtData = {
  title?: string;
  latest?: number | null;
  due_1y?: number | null;
  as_of?: string | null;
  updated_at?: string;
  totals?: Record<string, number>;
  observations?: Array<{
    term: string;
    days: number;
    amount: number;
    maturity?: string;
    value?: number;
  }>;
  summary?: string;
  papers?: Array<{ title: string; url: string }>;
};

const data = usDebtData as USDebtData;

export default function USDebtPage() {
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
            US Treasury Debt
          </h1>
          <ChartInfoButtons
            summary={
              data.summary ??
              "Marketable Treasuries lined up by days until they come due. Each line is the original term."
            }
            papers={data.papers ?? []}
            brewsHref="/bleaks-brews#us-debt"
          />
        </div>
        <div className="mt-8">
          <USDebtChart
            observations={data.observations ?? []}
            latest={typeof data.latest === "number" ? data.latest : null}
            due1y={typeof data.due_1y === "number" ? data.due_1y : null}
            asOf={data.as_of ?? null}
            totals={data.totals ?? {}}
            updatedAt={data.updated_at ?? null}
          />
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-400">
          Colored lines are original terms. The white line is the running total — at 365 days it is how much
          comes due within a year; at the far right it is the whole pile. TIPS and floating-rate notes are not in the lines.
        </p>

        <div className="mt-6">
          <DataGradeSection
            items={[
              {
                label: "MSPD CUSIP outstanding",
                grade: "B",
                description:
                  "Treasury's own monthly books of what it still owes, CUSIP by CUSIP. Not a market price, and original term is inferred from first issue date to maturity.",
              },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
