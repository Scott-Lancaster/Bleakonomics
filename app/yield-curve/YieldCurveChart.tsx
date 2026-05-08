'use client';

import { useMemo, useState } from "react";

type Observation = {
  date: string;
  value: number;
};

type Recession = {
  start: string;
  end: string;
};

type YieldCurveChartProps = {
  observations: Observation[];
  recessions: Recession[];
  latest: number | null;
  updatedAt: string | null;
};

const ranges = [
  { label: "1Y", years: 1 },
  { label: "5Y", years: 5 },
  { label: "10Y", years: 10 },
  { label: "Max", years: null },
];

const width = 1100;
const height = 560;
const pad = { top: 34, right: 34, bottom: 54, left: 62 };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(new Date(date));
}

export default function YieldCurveChart({
  observations,
  recessions,
  latest,
  updatedAt,
}: YieldCurveChartProps) {
  const [activeRange, setActiveRange] = useState<number | null>(10);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(() => {
    const clean = observations
      .filter((point) => Number.isFinite(point.value))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (!activeRange || clean.length === 0) {
      return clean;
    }

    const lastDate = new Date(clean[clean.length - 1].date);
    const cutoff = new Date(lastDate);
    cutoff.setFullYear(lastDate.getFullYear() - activeRange);
    return clean.filter((point) => new Date(point.date) >= cutoff);
  }, [activeRange, observations]);

  const chart = useMemo(() => {
    if (points.length < 2) {
      return null;
    }

    const times = points.map((point) => new Date(point.date).getTime());
    const values = points.map((point) => point.value);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const rawMin = Math.min(...values, 0);
    const rawMax = Math.max(...values, 0);
    const padding = Math.max((rawMax - rawMin) * 0.12, 0.25);
    const minValue = rawMin - padding;
    const maxValue = rawMax + padding;

    const x = (time: number) =>
      pad.left + ((time - minTime) / (maxTime - minTime)) * (width - pad.left - pad.right);
    const y = (value: number) =>
      pad.top + ((maxValue - value) / (maxValue - minValue)) * (height - pad.top - pad.bottom);

    const line = points
      .map((point, index) => {
        const command = index === 0 ? "M" : "L";
        return command + " " + x(new Date(point.date).getTime()).toFixed(2) + " " + y(point.value).toFixed(2);
      })
      .join(" ");

    const zeroY = y(0);
    const yTicks = Array.from({ length: 6 }, (_, index) => {
      const value = minValue + ((maxValue - minValue) / 5) * index;
      return { value, y: y(value) };
    });
    const xTicks = Array.from({ length: 6 }, (_, index) => {
      const time = minTime + ((maxTime - minTime) / 5) * index;
      return { date: new Date(time).toISOString(), x: x(time) };
    });
    const recessionBands = recessions
      .map((recession) => {
        const start = Math.max(new Date(recession.start).getTime(), minTime);
        const end = Math.min(new Date(recession.end).getTime(), maxTime);

        if (end <= minTime || start >= maxTime || end <= start) {
          return null;
        }

        return {
          x: x(start),
          width: Math.max(x(end) - x(start), 1),
        };
      })
      .filter((band): band is { x: number; width: number } => band !== null);

    return { line, x, y, zeroY, yTicks, xTicks, recessionBands };
  }, [points, recessions]);

  const activePoint = hoverIndex === null ? points[points.length - 1] : points[hoverIndex];
  const activeX = chart && activePoint ? chart.x(new Date(activePoint.date).getTime()) : 0;
  const activeY = chart && activePoint ? chart.y(activePoint.value) : 0;

  if (!chart || !activePoint) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
        Run <code className="text-neutral-200">python3 scripts/10Year2Year.py</code> to generate
        interactive chart data at <code className="text-neutral-200">public/data/yield_curve.json</code>.
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-neutral-900 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
            10Y - 2Y Treasury Yield Spread
          </p>
          <p className="mt-2 text-4xl font-bold text-white">{activePoint.value.toFixed(2)}%</p>
          <p className="mt-1 text-sm text-neutral-400">
            {formatDate(activePoint.date)} {latest !== null ? "· Latest: " + latest.toFixed(2) + "%" : ""}
          </p>
        </div>

        <div className="flex gap-2">
          {ranges.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setActiveRange(range.years)}
              className={
                "rounded-md border px-3 py-2 text-sm font-semibold transition " +
                (activeRange === range.years
                  ? "border-white bg-white text-black"
                  : "border-neutral-800 text-neutral-300 hover:border-neutral-600")
              }
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden" onMouseLeave={() => setHoverIndex(null)}>
        <svg
          viewBox={"0 0 " + width + " " + height}
          role="img"
          aria-label="Interactive line chart of the 10Y minus 2Y Treasury yield spread"
          className="h-auto w-full"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const mouseX = ((event.clientX - rect.left) / rect.width) * width;
            let nearest = 0;
            let distance = Infinity;

            points.forEach((point, index) => {
              const px = chart.x(new Date(point.date).getTime());
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
          {chart.recessionBands.map((band, index) => (
            <rect
              key={index}
              x={band.x}
              y={pad.top}
              width={band.width}
              height={height - pad.top - pad.bottom}
              fill="#7f1d1d"
              opacity="0.28"
            />
          ))}
          {chart.yTicks.map((tick) => (
            <g key={tick.value}>
              <line x1={pad.left} x2={width - pad.right} y1={tick.y} y2={tick.y} stroke="#262626" strokeWidth="1" />
              <text x={pad.left - 14} y={tick.y + 4} fill="#737373" fontSize="13" textAnchor="end">
                {tick.value.toFixed(1)}%
              </text>
            </g>
          ))}
          {chart.xTicks.map((tick) => (
            <text key={tick.date} x={tick.x} y={height - 18} fill="#737373" fontSize="13" textAnchor="middle">
              {formatShortDate(tick.date)}
            </text>
          ))}
          <line x1={pad.left} x2={width - pad.right} y1={chart.zeroY} y2={chart.zeroY} stroke="#ef4444" strokeDasharray="7 7" strokeWidth="1.4" />
          <path d={chart.line} fill="none" stroke="#e5e5e5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <line x1={activeX} x2={activeX} y1={pad.top} y2={height - pad.bottom} stroke="#525252" strokeWidth="1" />
          <circle cx={activeX} cy={activeY} r="6" fill="#ffffff" stroke="#0a0a0a" strokeWidth="3" />
          <g transform={"translate(" + Math.min(activeX + 16, width - 245) + " " + Math.max(activeY - 66, 18) + ")"}>
            <rect width="225" height="56" rx="6" fill="#171717" stroke="#404040" />
            <text x="12" y="23" fill="#d4d4d4" fontSize="13">{formatDate(activePoint.date)}</text>
            <text x="12" y="43" fill="#ffffff" fontSize="18" fontWeight="700">{activePoint.value.toFixed(2)}%</text>
          </g>
        </svg>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-500">
        Source: FRED T10Y2Y and USREC. Red bands mark NBER recession periods. {updatedAt ? "Updated " + formatDate(updatedAt) + "." : ""}
      </p>
    </section>
  );
}
