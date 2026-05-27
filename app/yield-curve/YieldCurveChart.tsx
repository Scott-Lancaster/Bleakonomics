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

type RangePreset = {
  label: string;
  months?: number;
  years?: number;
  ytd?: boolean;
  max?: boolean;
};

const ranges: RangePreset[] = [
  { label: "6M", months: 6 },
  { label: "YTD", ytd: true },
  { label: "1Y", years: 1 },
  { label: "2Y", years: 2 },
  { label: "5Y", years: 5 },
  { label: "10Y", years: 10 },
  { label: "20Y", years: 20 },
  { label: "Max", max: true },
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

function toInputDate(date: string) {
  return date.slice(0, 10);
}

function getPresetCutoff(preset: RangePreset, lastDate: Date) {
  if (preset.max) {
    return null;
  }

  const cutoff = new Date(lastDate);

  if (preset.ytd) {
    return new Date(lastDate.getFullYear(), 0, 1);
  }

  if (preset.months) {
    cutoff.setMonth(lastDate.getMonth() - preset.months);
    return cutoff;
  }

  if (preset.years) {
    cutoff.setFullYear(lastDate.getFullYear() - preset.years);
    return cutoff;
  }

  return null;
}

export default function YieldCurveChart({
  observations,
  recessions,
  latest,
  updatedAt,
}: YieldCurveChartProps) {
  const cleanObservations = useMemo(
    () =>
      observations
        .filter((point) => Number.isFinite(point.value))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [observations],
  );

  const minDate = cleanObservations[0]?.date ?? "";
  const maxDate = cleanObservations[cleanObservations.length - 1]?.date ?? "";

  const [activeRange, setActiveRange] = useState("10Y");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(() => {
    if (cleanObservations.length === 0) {
      return cleanObservations;
    }

    if (activeRange === "Custom") {
      const startTime = customStart ? new Date(customStart).getTime() : -Infinity;
      const endTime = customEnd ? new Date(customEnd).getTime() : Infinity;
      return cleanObservations.filter((point) => {
        const time = new Date(point.date).getTime();
        return time >= startTime && time <= endTime;
      });
    }

    const preset = ranges.find((range) => range.label === activeRange) ?? ranges[6];
    const lastDate = new Date(cleanObservations[cleanObservations.length - 1].date);
    const cutoff = getPresetCutoff(preset, lastDate);

    if (!cutoff) {
      return cleanObservations;
    }

    return cleanObservations.filter((point) => new Date(point.date) >= cutoff);
  }, [activeRange, cleanObservations, customEnd, customStart]);

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

  const isInspecting = hoverIndex !== null;
  const activePoint = hoverIndex === null ? points[points.length - 1] : points[hoverIndex];
  const activeX = chart && activePoint ? chart.x(new Date(activePoint.date).getTime()) : 0;
  const activeY = chart && activePoint ? chart.y(activePoint.value) : 0;
  const customRangeInvalid = Boolean(customStart && customEnd && customStart > customEnd);

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
      <div className="flex flex-col gap-5 border-b border-neutral-900 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              10Y - 2Y Treasury Yield Spread
            </p>
            <p className="mt-2 text-4xl font-bold text-white">{activePoint.value.toFixed(2)}%</p>
            <p className="mt-1 text-sm text-neutral-400">
              {formatDate(activePoint.date)} {isInspecting && latest !== null ? "· Latest: " + latest.toFixed(2) + "%" : ""}
            </p>
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

        <div className="flex flex-col gap-3 rounded-md border border-neutral-900 bg-black/40 p-3 sm:flex-row sm:items-end">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Start
            <input
              type="date"
              min={toInputDate(minDate)}
              max={toInputDate(maxDate)}
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
              className="h-10 rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm font-medium normal-case tracking-normal text-white [color-scheme:dark]"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            End
            <input
              type="date"
              min={toInputDate(minDate)}
              max={toInputDate(maxDate)}
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              className="h-10 rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm font-medium normal-case tracking-normal text-white [color-scheme:dark]"
            />
          </label>
          <button
            type="button"
            disabled={customRangeInvalid || (!customStart && !customEnd)}
            onClick={() => {
              setActiveRange("Custom");
              setHoverIndex(null);
            }}
            className="h-10 rounded-md border border-neutral-700 px-4 text-sm font-semibold text-white transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:border-neutral-900 disabled:text-neutral-700"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomStart("");
              setCustomEnd("");
              setActiveRange("10Y");
              setHoverIndex(null);
            }}
            className="h-10 rounded-md border border-neutral-900 px-4 text-sm font-semibold text-neutral-400 transition hover:border-neutral-700 hover:text-white"
          >
            Reset
          </button>
          {activeRange === "Custom" && !customRangeInvalid ? (
            <p className="text-sm text-neutral-400">Custom range active</p>
          ) : null}
          {customRangeInvalid ? (
            <p className="text-sm text-red-400">Start date must be before end date.</p>
          ) : null}
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
          {isInspecting ? (
            <>
              <line x1={activeX} x2={activeX} y1={pad.top} y2={height - pad.bottom} stroke="#525252" strokeWidth="1" />
              <circle cx={activeX} cy={activeY} r="6" fill="#ffffff" stroke="#0a0a0a" strokeWidth="3" />
              <g transform={"translate(" + Math.min(activeX + 16, width - 245) + " " + Math.max(activeY - 66, 18) + ")"}>
                <rect width="225" height="56" rx="6" fill="#171717" stroke="#404040" />
                <text x="12" y="23" fill="#d4d4d4" fontSize="13">{formatDate(activePoint.date)}</text>
                <text x="12" y="43" fill="#ffffff" fontSize="18" fontWeight="700">{activePoint.value.toFixed(2)}%</text>
              </g>
            </>
          ) : null}
        </svg>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-500">
        Source: FRED T10Y2Y and USREC. Red bands mark NBER recession periods. {updatedAt ? "Updated " + formatDate(updatedAt) + "." : ""}
      </p>
    </section>
  );
}
