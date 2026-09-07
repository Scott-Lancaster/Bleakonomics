import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../../bleaklogo1.png";
import sofrIorbData from "../../public/data/sofr_iorb.json";
import DonateButton from "../../components/DonateButton";
import ChartInfoButtons from "../../components/ChartInfoButtons";
import DataGradeSection from "../../components/DataGradeSection";
import SOFRIORBChart from "./SOFRIORBChart";

type SOFRIORBData = {
  title?: string;
  latest?: number;
  updated_at?: string;
  observations?: Array<{
    date: string;
    value: number;
    sofr?: number | null;
    iorb?: number | null;
    ma30?: number | null;
  }>;
  summary?: string;
  papers?: Array<{ title: string; url: string }>;
};

const data = sofrIorbData as SOFRIORBData;

export default function SOFRIORBPage() {
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
            SOFR - IORB Spread
          </h1>
          <ChartInfoButtons
            summary={
              data.summary ??
              "SOFR is what it costs to borrow cash overnight using Treasuries as collateral. IORB is what the Fed pays banks to park money. When SOFR jumps above IORB, cash is getting scarce."
            }
            papers={data.papers ?? []}
            brewsHref="/bleaks-brews#sofr-iorb"
          />
        </div>

        <div className="mt-8">
          <SOFRIORBChart
            observations={data.observations ?? []}
            latest={typeof data.latest === "number" ? data.latest : null}
            updatedAt={data.updated_at ?? null}
          />
        </div>

        <div className="mt-6">
          <DataGradeSection
            items={[
              {
                label: "SOFR",
                grade: "A",
                description:
                  "Market-set overnight repo rate. Trades every business day. Strong print.",
              },
              {
                label: "IORB",
                grade: "C",
                description:
                  "The Fed sets this. It is policy, not a market discovering a price. The spread is only as honest as this half.",
              },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
