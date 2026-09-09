'use client';

import { useMemo, useState } from "react";

type Observation = {
  term: string;
  days: number;
  amount: number;
  maturity?: string;
  value?: number;
};

type USDebtChartProps = {
  observations: Observation[];
  latest: number | null;
  due1y?: number | null;
  asOf?: string | null;
  totals?: Record<string, number>;
  updatedAt: string | null;
};

type RangePreset = {
  label: string;
  days?: number;
  max?: boolean;
};

const ranges: RangePreset[] = [
  { label: "6M", days: 183 },
  { label: "1Y", days: 365 },
  { label: "2Y", days: 730 },
  { label: "5Y", days: 1826 },
  { label: "10Y", days: 3652 },
  { label: "20Y", days: 7305 },
  { label: "Max", max: true },
];

const terms = [
  { key: "Bills", color: "#e07a5f" },
  { key: "2Y", color: "#6f9e78" },
  { key: "3Y", color: "#5b8fc7" },
  { key: "5Y", color: "#c4a35a" },
  { key: "7Y", color: "#9b7ed9" },
  { key: "10Y", color: "#d6d6d6" },
  { key: "20Y", color: "#7fbfcf" },
  { key: "30Y", color: "#e8c36a" },
] as const;

const width = 1100;
const height = 560;
const pad = { top: 34, right: 72, bottom: 58, left: 72 };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date.slice(0, 10) + "T12:00:00"));
}

function formatBillions(value: number) {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : 1;
  return (value < 0 ? "-$" : "$") + abs.toFixed(digits) + "B";
}

function formatTrillions(valueB: number) {
  return "$" + (valueB / 1000).toFixed(1) + "T";
}

function formatDays(days: number) {
  if (days < 365) return days.toLocaleString("en-US") + "d";
  return days.toLocaleString("en-US") + "d · " + (days / 365.25).toFixed(1) + "y";
}

export default function USDebtChart({
  observations,
  latest,
  due1y,
  asOf,
  totals,
  updatedAt,
}: USDebtChartProps) {
  const clean = useMemo(
    () =>
      observations
        .filter((point) => Number.isFinite(point.days) && Number.isFinite(point.amount))
        .sort((a, b) => a.days - b.days),
    [observations],
  );

  const [activeRange, setActiveRange] = useState("Max");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(() => {
    const preset = ranges.find((range) => range.label === activeRange) ?? ranges[ranges.length - 1];
    if (preset.max || !preset.days) return clean;
    return clean.filter((point) => point.days <= preset.days);
  }, [activeRange, clean]);

  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const maxDays = Math.max(...points.map((point) => point.days), 1);
    const maxAmount = Math.max(...points.map((point) => point.amount), 0) * 1.12;
    const byDay = new Map<number, number>();
    points.forEach((point) => {
      byDay.set(point.days, (byDay.get(point.days) ?? 0) + point.amount);
    });
    const cumulative = Array.from(byDay.entries())
      .sort((a, b) => a[0] - b[0])
      .reduce<Array<{ days: number; amount: number }>>((list, [days, amount]) => {
        const prev = list.length ? list[list.length - 1].amount : 0;
        list.push({ days, amount: prev + amount });
        return list;
      }, []);
    const maxCum = Math.max(...cumulative.map((point) => point.amount), 0) * 1.12;
    const x = (days: number) => pad.left + (days / maxDays) * (width - pad.left - pad.right);
    const y = (amount: number) =>
      pad.top + ((maxAmount - amount) / maxAmount) * (height - pad.top - pad.bottom);
    const yCum = (amount: number) =>
      pad.top + ((maxCum - amount) / maxCum) * (height - pad.top - pad.bottom);

    const lines = terms.map((term) => {
      const series = points.filter((point) => point.term === term.key).sort((a, b) => a.days - b.days);
      const d = series
        .map((point, index) => {
          const command = index === 0 ? "M" : "L";
          return command + " " + x(point.days).toFixed(2) + " " + y(point.amount).toFixed(2);
        })
        .join(" ");
      return { key: term.key, color: term.color, d, series };
    });
    const cumLine = cumulative
      .map((point, index) => {
        const command = index === 0 ? "M" : "L";
        return command + " " + x(point.days).toFixed(2) + " " + yCum(point.amount).toFixed(2);
      })
      .join(" ");

    const yTicks = Array.from({ length: 6 }, (_, index) => {
      const value = (maxAmount / 5) * index;
      return { value, y: y(value) };
    });
    const cumTicks = Array.from({ length: 6 }, (_, index) => {
      const value = (maxCum / 5) * index;
      return { value, y: yCum(value) };
    });
    const dayTicks = [0, 365, 730, 1826, 3652, 7305, 10957]
      .filter((days) => days <= maxDays + 20)
      .map((days) => ({ days, x: x(days) }));

    return { x, y, yCum, maxDays, maxAmount, lines, cumLine, cumulative, yTicks, cumTicks, dayTicks };
  }, [points]);

  const isInspecting = hoverIndex !== null;
  const activePoint = hoverIndex === null ? points[points.length - 1] : points[hoverIndex];
  const visibleTotal = points.reduce((sum, point) => sum + point.amount, 0);

  if (!chart || !activePoint) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
        Run <code className="text-neutral-200">python3 scripts/USDebt.py</code> to generate
        interactive chart data at <code className="text-neutral-200">public/data/us_debt.json</code>.
      </div>
    );
  }

  const activeX = chart.x(activePoint.days);
  const activeY = chart.y(activePoint.amount);
  const activeCumulative =
    chart.cumulative.find((point) => point.days === activePoint.days)?.amount ??
    chart.cumulative.filter((point) => point.days <= activePoint.days).at(-1)?.amount ??
    0;

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 sm:p-6">
      <div className="flex flex-col gap-5 border-b border-neutral-900 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Marketable Treasuries
            </p>
            <p className="mt-2 text-4xl font-bold text-white">
              {formatTrillions(latest ?? visibleTotal)}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              {asOf ? "As of " + formatDate(asOf) : ""}
              {due1y != null ? " · " + formatTrillions(due1y) + " due within 1 year" : ""}
            </p>
            {isInspecting ? (
              <p className="mt-1 text-sm text-neutral-400">
                {activePoint.term} · {formatDays(activePoint.days)} · {formatBillions(activePoint.amount)}
                {activePoint.maturity ? " · matures " + formatDate(activePoint.maturity) : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {ranges.map((range) => (
              <button
                key={range.label}
                type="button"
                onClick={() => {
                  setActiveRange(range.label);
                  setHoverIndex(null);
                }}
                className={
                  "rounded-md border px-3 py-2 text-sm font-semibold transition " +
                  (activeRange === range.label
                    ? "border-white bg-white text-black"
                    : "border-neutral-800 text-neutral-300 hover:border-neutral-600")
                }
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {terms.map((term) => (
            <span key={term.key} className="inline-flex items-center gap-2">
              <span className="h-0.5 w-4" style={{ background: term.color }} />
              {term.key}
              {totals && totals[term.key] != null ? " " + formatBillions(totals[term.key]) : ""}
            </span>
          ))}
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 bg-[#f0f0f0]" />
            Cumulative
          </span>
        </div>
      </div>

      <div className="mt-5 overflow-hidden" onMouseLeave={() => setHoverIndex(null)}>
        <svg
          viewBox={"0 0 " + width + " " + height}
          role="img"
          aria-label="US Treasury debt outstanding by days remaining until maturity, with a cumulative total on a second axis"
          className="h-auto w-full"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const mouseX = ((event.clientX - rect.left) / rect.width) * width;
            let nearest = 0;
            let distance = Infinity;
            points.forEach((point, index) => {
              const px = chart.x(point.days);
              const nextDistance = Math.abs(px - mouseX);
              if (nextDistance < distance) {
                distance = nextDistance;
                nearest = index;
              }
            });
            setHoverIndex(nearest);
          }}
        >
          <rect width={width} height={height} fill="#0a0a0a" />
          {chart.yTicks.map((tick) => (
            <g key={"y" + tick.value}>
              <line x1={pad.left} x2={width - pad.right} y1={tick.y} y2={tick.y} stroke="#262626" strokeWidth="1" />
              <text x={pad.left - 14} y={tick.y + 4} fill="#737373" fontSize="13" textAnchor="end">
                {formatBillions(tick.value)}
              </text>
            </g>
          ))}
          {chart.dayTicks.map((tick) => (
            <text key={tick.days} x={tick.x} y={height - 18} fill="#737373" fontSize="12" textAnchor="middle">
              {tick.days === 0 ? "0d" : tick.days.toLocaleString("en-US") + "d"}
            </text>
          ))}
          {chart.lines.map((line) =>
            line.d ? (
              <path
                key={line.key}
                d={line.d}
                fill="none"
                stroke={line.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null,
          )}
          <path
            d={chart.cumLine}
            fill="none"
            stroke="#f0f0f0"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {chart.cumTicks.map((tick) => (
            <text key={"c" + tick.value} x={width - pad.right + 8} y={tick.y + 4} fill="#f0f0f0" fontSize="12">
              {formatTrillions(tick.value)}
            </text>
          ))}
          {isInspecting ? (
            <>
              <line x1={activeX} x2={activeX} y1={pad.top} y2={height - pad.bottom} stroke="#525252" strokeWidth="1" />
              <circle cx={activeX} cy={activeY} r="5" fill="#ffffff" stroke="#0a0a0a" strokeWidth="2" />
              <g transform={"translate(" + Math.min(activeX + 16, width - 250) + " 18)"}>
                <rect width="230" height="102" rx="6" fill="#171717" stroke="#404040" />
                <text x="12" y="22" fill="#d4d4d4" fontSize="13">
                  {activePoint.term} · {formatDays(activePoint.days)}
                </text>
                <text x="12" y="46" fill="#ffffff" fontSize="16" fontWeight="700">
                  {formatBillions(activePoint.amount)}
                </text>
                <text x="12" y="68" fill="#f0f0f0" fontSize="13">
                  Cumulative {formatTrillions(activeCumulative)}
                </text>
                <text x="12" y="88" fill="#a3a3a3" fontSize="13">
                  {activePoint.maturity ? "Matures " + formatDate(activePoint.maturity) : ""}
                </text>
              </g>
            </>
          ) : null}
        </svg>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-500">
        Left axis: face amount of each original term still outstanding. Right axis: running total of all those
        dollars that come due by that remaining-day count. X-axis is days remaining, not calendar history.
        TIPS and FRNs are omitted. Range buttons clip remaining life, not calendar dates.
        {updatedAt ? " Updated " + formatDate(updatedAt) + "." : ""}
      </p>
    </section>
  );
}
