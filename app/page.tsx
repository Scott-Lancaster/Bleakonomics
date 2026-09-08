import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../bleaklogo1.png";
import SiteHeader from "../components/SiteHeader";
import yieldCurveData from "../public/data/yield_curve.json";
import unemploymentData from "../public/data/unemployment.json";
import sofrIorbData from "../public/data/sofr_iorb.json";
import cpiData from "../public/data/cpi.json";
import oilData from "../public/data/oil.json";
import m2Data from "../public/data/m2.json";
import netLiquidityData from "../public/data/net_liquidity.json";

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
  const latestUpdatedAt = [yieldCurveData.updated_at, unemploymentData.updated_at, sofrIorbData.updated_at, cpiData.updated_at, oilData.updated_at, m2Data.updated_at, netLiquidityData.updated_at]
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

        <nav className="mt-10 flex flex-wrap justify-center gap-2 border-y border-neutral-900 py-4">
          <Link
            href="#long-term-trends"
            className="rounded-md border border-neutral-800 px-3 py-2 text-sm font-semibold text-neutral-300 transition hover:border-neutral-600 hover:text-white"
          >
            Long Term Trends
          </Link>
          <Link
            href="#acute-charts"
            className="rounded-md border border-neutral-800 px-3 py-2 text-sm font-semibold text-neutral-300 transition hover:border-neutral-600 hover:text-white"
          >
            Acute Charts
          </Link>
        </nav>

        <section id="long-term-trends" className="mt-10 scroll-mt-24 grid gap-10 border-t border-neutral-900 pt-7">
          <h2 className="font-mono text-4xl font-bold tracking-wide text-white md:text-5xl">
            Long Term Trends
          </h2>
          <article>
            <h3 className="text-lg font-semibold text-neutral-300">
              10 Year - 2 Year Treasury Spread
            </h3>
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
            <h3 className="text-lg font-semibold text-neutral-300">
              US Unemployment Rate
            </h3>
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
            <h3 className="text-lg font-semibold text-neutral-300">
              CPI Inflation
            </h3>
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
                  How fast a typical pile of stuff is getting more expensive. The government adds it up once a month.
                </p>
              </div>
            </Link>
          </article>
          <article>
            <h3 className="text-lg font-semibold text-neutral-300">
              US M2 Money Supply
            </h3>
            <Link
              href="/m2"
              className="group relative mt-6 block overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 transition hover:border-neutral-600"
              aria-label="Open interactive US M2 Money Supply chart"
            >
              <img
                src="/charts/m2.png"
                alt="US M2 Money Supply chart"
                className="aspect-[2/1] w-full bg-neutral-950 object-contain transition duration-300 group-hover:scale-[1.01] group-hover:opacity-35"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black via-black/70 to-transparent p-5 opacity-0 transition duration-300 group-hover:opacity-100">
                <p className="max-w-2xl text-sm leading-6 text-neutral-200 sm:text-base sm:leading-7">
                  The pile of US dollars. About a fifth of one year of world output — a size check, not a slice of global money.
                </p>
              </div>
            </Link>
          </article>
          <article>
            <h3 className="text-lg font-semibold text-neutral-300">
              WTI Crude Oil
            </h3>
            <Link
              href="/oil"
              className="group relative mt-6 block overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 transition hover:border-neutral-600"
              aria-label="Open interactive WTI Crude Oil chart"
            >
              <img
                src="/charts/oil.png"
                alt="WTI Crude Oil chart"
                className="aspect-[2/1] w-full bg-neutral-950 object-contain transition duration-300 group-hover:scale-[1.01] group-hover:opacity-35"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black via-black/70 to-transparent p-5 opacity-0 transition duration-300 group-hover:opacity-100">
                <p className="max-w-2xl text-sm leading-6 text-neutral-200 sm:text-base sm:leading-7">
                  Dollars per barrel at Cushing. Energy costs show up in inflation, freight, and the price of running the real economy.
                </p>
              </div>
            </Link>
          </article>
        </section>

        <section id="acute-charts" className="mt-16 scroll-mt-24 grid gap-10 border-t border-neutral-900 pt-7">
          <h2 className="font-mono text-4xl font-bold tracking-wide text-white md:text-5xl">
            Acute Charts
          </h2>
          <article>
            <h3 className="text-lg font-semibold text-neutral-300">
              US Net Liquidity
            </h3>
            <Link
              href="/net-liquidity"
              className="group relative mt-6 block overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 transition hover:border-neutral-600"
              aria-label="Open interactive US Net Liquidity chart"
            >
              <img
                src="/charts/net_liquidity.png"
                alt="US Net Liquidity chart"
                className="aspect-[2/1] w-full bg-neutral-950 object-contain transition duration-300 group-hover:scale-[1.01] group-hover:opacity-35"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black via-black/70 to-transparent p-5 opacity-0 transition duration-300 group-hover:opacity-100">
                <p className="max-w-2xl text-sm leading-6 text-neutral-200 sm:text-base sm:leading-7">
                  Fed assets minus Treasury cash minus overnight RRP. Starts 2002 — not a 1980s series.
                </p>
              </div>
            </Link>
          </article>
          <article>
            <h3 className="text-lg font-semibold text-neutral-300">
              SOFR - IORB Spread
            </h3>
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
                  Overnight cash versus what the Fed pays banks to sit still. When this jumps, cash is getting scarce.
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
