import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../bleaklogo1.png";
import SiteHeader from "../components/SiteHeader";
import yieldCurveData from "../public/data/yield_curve.json";
import unemploymentData from "../public/data/unemployment.json";
import sofrIorbData from "../public/data/sofr_iorb.json";
import cpiData from "../public/data/cpi.json";

function formatUpdatedAtUtc(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(date));
}

export default function Home() {
  const latestUpdatedAt = [yieldCurveData.updated_at, unemploymentData.updated_at, sofrIorbData.updated_at, cpiData.updated_at]
    .filter(Boolean)
    .sort()
    .at(-1);
  const updatedAt = latestUpdatedAt
    ? formatUpdatedAtUtc(latestUpdatedAt)
    : "Pending first update";

  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeader active="home" />

      <section className="mx-auto flex max-w-6xl flex-col px-6 pb-16 pt-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            src={bleakLogo}
            alt="Bleakonomics logo"
            className="h-16 w-16 object-contain sm:h-20 sm:w-20"
            priority
          />
          <h1 className="font-mono text-5xl font-bold tracking-wide text-white md:text-7xl">
            Bleakonomics
          </h1>
        </div>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-neutral-400">
          Macro charts for the people. Free, Open, & Current.
        </p>

        <section className="mt-10 grid gap-10 border-t border-neutral-900 pt-7">
          <article>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              10 Year - 2 Year Treasury Spread
            </h2>
            <Link
              href="/yield-curve"
              className="group relative mt-6 block overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 transition hover:border-neutral-600"
              aria-label="Open interactive 10Y - 2Y Treasury Spread chart"
            >
              <img
                src="/charts/yield_curve.png"
                alt="10Y - 2Y Treasury Spread chart"
                className="aspect-[2/1] w-full bg-neutral-950 object-contain transition duration-300 group-hover:scale-[1.01] group-hover:opacity-35"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black via-black/70 to-transparent p-5 opacity-0 transition duration-300 group-hover:opacity-100">
                <p className="max-w-2xl text-sm leading-6 text-neutral-200 sm:text-base sm:leading-7">
                  Negative spread equals negative sentiment. Investors have more faith in the economy 2 years from now than 10 years from now.
                </p>
              </div>
            </Link>
          </article>

          <article>
            <h2 className="text-2xl font-semibold text-white">
              US Unemployment Rate
            </h2>
            <Link
              href="/unemployment"
              className="group relative mt-6 block overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 transition hover:border-neutral-600"
              aria-label="Open interactive US Unemployment Rate chart"
            >
              <img
                src="/charts/unemployment.png"
                alt="US Unemployment Rate chart"
                className="aspect-[2/1] w-full bg-neutral-950 object-contain transition duration-300 group-hover:scale-[1.01] group-hover:opacity-35"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black via-black/70 to-transparent p-5 opacity-0 transition duration-300 group-hover:opacity-100">
                <p className="max-w-2xl text-sm leading-6 text-neutral-200 sm:text-base sm:leading-7">
                  The unemployment rate is the share of people in the labor force who are actively looking for work but do not have a job. Less of a predictor and more of an indication that stress has hit U.S. households.
                </p>
              </div>
            </Link>
          </article>


          <article>
            <h2 className="text-2xl font-semibold text-white">
              CPI Inflation
            </h2>
            <Link
              href="/cpi"
              className="group relative mt-6 block overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 transition hover:border-neutral-600"
              aria-label="Open interactive CPI Inflation chart"
            >
              <img
                src="/charts/cpi.png"
                alt="CPI Inflation chart"
                className="aspect-[2/1] w-full bg-neutral-950 object-contain transition duration-300 group-hover:scale-[1.01] group-hover:opacity-35"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black via-black/70 to-transparent p-5 opacity-0 transition duration-300 group-hover:opacity-100">
                <p className="max-w-2xl text-sm leading-6 text-neutral-200 sm:text-base sm:leading-7">
                  Under Construction
                </p>
              </div>
            </Link>
          </article>
          <article>
            <h2 className="text-2xl font-semibold text-white">
              SOFR - IORB Spread
            </h2>
            <Link
              href="/sofr-iorb"
              className="group relative mt-6 block overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 transition hover:border-neutral-600"
              aria-label="Open interactive SOFR - IORB Spread chart"
            >
              <img
                src="/charts/sofr_iorb.png"
                alt="SOFR - IORB Spread chart"
                className="aspect-[2/1] w-full bg-neutral-950 object-contain transition duration-300 group-hover:scale-[1.01] group-hover:opacity-35"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black via-black/70 to-transparent p-5 opacity-0 transition duration-300 group-hover:opacity-100">
                <p className="max-w-2xl text-sm leading-6 text-neutral-200 sm:text-base sm:leading-7">
                  Under Construction
                </p>
              </div>
            </Link>
          </article>
        </section>
      </section>

      <footer className="border-t border-neutral-900 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>Last updated: {updatedAt}</p>
            <p className="text-xs text-neutral-600">
              Bleakonomics has no affiliation with the Freakonomics brand or Bleakonomics by Rob Larson.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
