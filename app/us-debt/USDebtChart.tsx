'use client';

import { useMemo, useState } from "react";
import { latestDataParen } from "../../components/LatestDataStamp";

type Bucket = {
  key: string;
  label: string;
  days_min?: number;
  days_max?: number;
  terms: Record<string, number>;
  yields?: Record<string, number | null>;
  avg_yield?: number | null;
  total: number;
};

type HoverTarget = {
  bucketIndex: number;
  term: string;
};

type USDebtChartProps = {
  buckets: Bucket[];
  latest: number | null;
  due1y?: number | null;
  asOf?: string | null;
  totals?: Record<string, number>;
  updatedAt: string | null;
};

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
const pad = { top: 28, right: 28, bottom: 78, left: 72 };

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

function formatYield(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value.toFixed(2) + "%";
}

export default function USDebtChart({
  buckets,
  latest,
  due1y,
  asOf,
  totals,
  updatedAt,
}: USDebtChartProps) {
  const clean = useMemo(
    () => buckets.filter((bucket) => Number.isFinite(bucket.total)),
    [buckets],
  );
  const [hover, setHover] = useState<HoverTarget | null>(null);

  const chart = useMemo(() => {
    if (clean.length === 0) return null;
    const maxValue = Math.max(...clean.map((bucket) => bucket.total), 0) / 1000;
    const maxY = Math.max(maxValue * 1.18, 0.5);
    const slot = (width - pad.left - pad.right) / clean.length;
    const barWidth = slot * 0.62;
    const y = (trillion: number) =>
      pad.top + ((maxY - trillion) / maxY) * (height - pad.top - pad.bottom);
    const yTicks = Array.from({ length: 6 }, (_, index) => {
      const value = (maxY / 5) * index;
      return { value, y: y(value) };
    });
    const columns = clean.map((bucket, index) => {
      const x = pad.left + slot * index + (slot - barWidth) / 2;
      let bottom = 0;
      const segments = terms
        .map((term) => {
          const amount = bucket.terms?.[term.key] ?? 0;
          if (amount <= 0) return null;
          const heightPx = y(bottom) - y(bottom + amount / 1000);
          const top = y(bottom + amount / 1000);
          const segment = {
            term: term.key,
            color: term.color,
            amount,
            yieldPct: bucket.yields?.[term.key] ?? null,
            x,
            y: top,
            width: barWidth,
            height: Math.max(heightPx, 0),
          };
          bottom += amount / 1000;
          return segment;
        })
        .filter((segment): segment is NonNullable<typeof segment> => segment !== null);
      return {
        key: bucket.key,
        label: bucket.label,
        total: bucket.total,
        avgYield: bucket.avg_yield ?? null,
        centerX: x + barWidth / 2,
        x,
        width: barWidth,
        segments,
      };
    });
    return { y, yTicks, columns, maxY };
  }, [clean]);

  if (!chart) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
        Run <code className="text-neutral-200">python3 scripts/USDebt.py</code> to generate
        interactive chart data at <code className="text-neutral-200">public/data/us_debt.json</code>.
      </div>
    );
  }

  const hoveredBucket = hover ? chart.columns[hover.bucketIndex] : null;
  const hoveredSegment = hoveredBucket?.segments.find((segment) => segment.term === hover?.term) ?? null;

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 sm:p-6">
      <div className="flex flex-col gap-5 border-b border-neutral-900 pb-5">
        <div>
          <p className="text-base font-bold text-white">
            US Treasury Debt{latestDataParen(asOf ?? updatedAt)}
          </p>
          <p className="mt-2 text-4xl font-bold text-white">
            {formatTrillions(latest ?? clean.reduce((sum, bucket) => sum + bucket.total, 0))}
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            {asOf ? "As of " + formatDate(asOf) : ""}
            {due1y != null ? " · " + formatTrillions(due1y) + " due in 4 quarters" : ""}
          </p>
          {hoveredBucket && hoveredSegment ? (
            <p className="mt-1 text-sm text-neutral-400">
              {hoveredBucket.label}: {hoveredSegment.term} {formatBillions(hoveredSegment.amount)}
              {formatYield(hoveredSegment.yieldPct) ? " · avg yield " + formatYield(hoveredSegment.yieldPct) : ""}
              {" · bar total "}
              {formatTrillions(hoveredBucket.total)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {terms.map((term) => (
            <span key={term.key} className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: term.color }} />
              {term.key}
              {totals && totals[term.key] != null ? " " + formatBillions(totals[term.key]) : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden" onMouseLeave={() => setHover(null)}>
        <svg
          viewBox={"0 0 " + width + " " + height}
          role="img"
          aria-label="Stacked bars of US Treasury debt by remaining life, colored by original term"
          className="h-auto w-full"
        >
          <rect width={width} height={height} fill="#0a0a0a" />
          {chart.yTicks.map((tick) => (
            <g key={"y" + tick.value}>
              <line x1={pad.left} x2={width - pad.right} y1={tick.y} y2={tick.y} stroke="#262626" strokeWidth="1" />
              <text x={pad.left - 14} y={tick.y + 4} fill="#737373" fontSize="13" textAnchor="end">
                {tick.value.toFixed(tick.value >= 10 ? 0 : 1) + "T"}
              </text>
            </g>
          ))}
          {chart.columns.map((column, bucketIndex) => (
            <g key={column.key}>
              {column.segments.map((segment) => (
                <rect
                  key={column.key + segment.term}
                  x={segment.x}
                  y={segment.y}
                  width={segment.width}
                  height={segment.height}
                  fill={segment.color}
                  opacity={hover && hover.bucketIndex === bucketIndex && hover.term !== segment.term ? 0.35 : 1}
                  onMouseEnter={() => setHover({ bucketIndex, term: segment.term })}
                />
              ))}
              <text
                x={column.centerX}
                y={height - 22}
                fill="#737373"
                fontSize="12"
                fontWeight="700"
                textAnchor="end"
                transform={"rotate(-32 " + column.centerX + " " + (height - 22) + ")"}
              >
                {column.label}
              </text>
              <text
                x={column.centerX}
                y={Math.max(pad.top + 12, chart.y(column.total / 1000) - 8)}
                fill="#d4d4d4"
                fontSize="12"
                textAnchor="middle"
              >
                {formatTrillions(column.total)}
              </text>
            </g>
          ))}
          {hoveredBucket && hoveredSegment ? (
            <g transform={"translate(" + Math.min(hoveredSegment.x + hoveredSegment.width + 12, width - 250) + " 18)"}>
              <rect width="236" height="102" rx="6" fill="#171717" stroke="#404040" />
              <text x="12" y="22" fill="#d4d4d4" fontSize="13">
                Due {hoveredBucket.label}
              </text>
              <text x="12" y="46" fill={hoveredSegment.color} fontSize="16" fontWeight="700">
                {hoveredSegment.term} {formatBillions(hoveredSegment.amount)}
              </text>
              <text x="12" y="68" fill="#e5e5e5" fontSize="13">
                {formatYield(hoveredSegment.yieldPct)
                  ? "Avg yield " + formatYield(hoveredSegment.yieldPct)
                  : "Avg yield —"}
              </text>
              <text x="12" y="88" fill="#a3a3a3" fontSize="13">
                Bar {formatTrillions(hoveredBucket.total)}
                {formatYield(hoveredBucket.avgYield) ? " · " + formatYield(hoveredBucket.avgYield) : ""}
              </text>
            </g>
          ) : null}
        </svg>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-500">
        X-axis is the month/year window those bonds come due. Hover a color for the outstanding-weighted average
        yield (bill auction yield, coupon on notes and bonds). Color is the original auction term. TIPS and FRNs are omitted.
        {updatedAt ? " Updated " + formatDate(updatedAt) + "." : ""}
      </p>
    </section>
  );
}
