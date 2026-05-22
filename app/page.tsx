import Image from "next/image";
import Link from "next/link";
import bleakLogo from "../bleaklogo1.png";
import DonateButton from "../components/DonateButton";
import yieldCurveData from "../public/data/yield_curve.json";

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
  const updatedAt = yieldCurveData.updated_at
    ? formatUpdatedAtUtc(yieldCurveData.updated_at)
    : "Pending first update";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute right-6 top-6 z-20">
        <DonateButton />
      </div>

      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-28">
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

        <section className="mt-10 border-t border-neutral-900 pt-7">
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
              <div className="max-w-2xl">
                <p className="text-lg font-semibold leading-7 text-white">
                  Negative spread equals negative sentiment.
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-300">
                  Investors have more faith in the economy 2 years from now
                  than 10 years from now.
                </p>
              </div>
            </div>
          </Link>
        </section>
      </section>

      <footer className="border-t border-neutral-900 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>Last updated: {updatedAt}</p>
            <p className="text-xs text-neutral-600">
              Bleakonomics has no affiliation with the Freakonomics brand.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Scott-Lancaster/Bleakonomics/tree/main/scripts"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-neutral-400 transition hover:text-white"
              aria-label="Open Bleakonomics chart scripts on GitHub"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-current"
              >
              <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.36 6.84 9.72.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.33 9.33 0 0 1 12 6.99c.85 0 1.7.12 2.5.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.95.68 1.92 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.49A10.04 10.04 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
