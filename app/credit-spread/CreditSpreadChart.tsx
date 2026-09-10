'use client';

import { useMemo, useState } from "react";
import { latestDataParen } from "../../components/LatestDataStamp";

type Observation = {
  date: string;
  value?: number | null;
  baa?: number | null;
  hy?: number | null;
};

type Recession = {
  start: string;
  end: string;
};

type CreditSpreadChartProps = {
  observations: Observation[];
  recessions: Recession[];
  latest: number | null;
  latestHy?: number | null;
  latestBaa?: number | null;
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
const pad = { top: 34, right: 34, bottom: 54, left: 72 };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date.slice(0, 10) + "T12:00:00"));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(new Date(date.slice(0, 10) + "T12:00:00"));
}

function toInputDate(date: string) {
  return date.slice(0, 10);
}

function formatSpread(value: number) {
  return value.toFixed(2) + "%";
}

function num(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getPresetCutoff(preset: RangePreset, lastDate: Date) {
  if (preset.max) return null;
  const cutoff = new Date(lastDate);
  if (preset.ytd) return new Date(lastDate.getFullYear(), 0, 1);
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

function linePath(
  points: Observation[],
  key: "baa" | "hy",
  x: (time: number) => number,
  y: (value: number) => number,
) {
  return points
    .map((point, index) => {
      const value = num(point[key]);
      if (value === null) return null;
      const prev = index === 0 ? null : num(points[index - 1][key]);
      const command = prev === null ? "M" : "L";
      return command + " " + x(new Date(point.date).getTime()).toFixed(2) + " " + y(value).toFixed(2);
    })
    .filter(Boolean)
    .join(" ");
}

export default function CreditSpreadChart({
  observations,
  recessions,
  latest,
  latestHy,
  latestBaa,
  updatedAt,
}: CreditSpreadChartProps) {
  const cleanObservations = useMemo(
    () =>
      observations
        .filter((point) => num(point.baa) !== null || num(point.hy) !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [observations],
  );

  const minDate = cleanObservations[0]?.date ?? "";
  const maxDate = cleanObservations[cleanObservations.length - 1]?.date ?? "";

  const [activeRange, setActiveRange] = useState("Max");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(() => {
    if (cleanObservations.length === 0) return cleanObservations;
    if (activeRange === "Custom") {
      const startTime = customStart ? new Date(customStart).getTime() : -Infinity;
      const endTime = customEnd ? new Date(customEnd).getTime() : Infinity;
      return cleanObservations.filter((point) => {
        const time = new Date(point.date).getTime();
        return time >= startTime && time <= endTime;
      });
    }
    const preset = ranges.find((range) => range.label === activeRange) ?? ranges[ranges.length - 1];
    const lastDate = new Date(cleanObservations[cleanObservations.length - 1].date);
    const cutoff = getPresetCutoff(preset, lastDate);
    if (!cutoff) return cleanObservations;
    return cleanObservations.filter((point) => new Date(point.date) >= cutoff);
  }, [activeRange, cleanObservations, customEnd, customStart]);

  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const times = points.map((point) => new Date(point.date).getTime());
    const values = points.flatMap((point) => [num(point.baa), num(point.hy)]).filter((value): value is number => value !== null);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const rawMin = Math.min(0, ...values);
    const rawMax = Math.max(...values, 0);
    const padding = Math.max((rawMax - rawMin) * 0.12, 0.4);
    const minValue = rawMin - padding * 0.15;
    const maxValue = rawMax + padding;

    const x = (time: number) =>
      pad.left + ((time - minTime) / (maxTime - minTime)) * (width - pad.left - pad.right);
    const y = (value: number) =>
      pad.top + ((maxValue - value) / (maxValue - minValue)) * (height - pad.top - pad.bottom);

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
        if (end <= minTime || start >= maxTime || end <= start) return null;
        return { x: x(start), width: Math.max(x(end) - x(start), 1) };
      })
      .filter((band): band is { x: number; width: number } => band !== null);

    return {
      x,
      y,
      zeroY: y(0),
      showZero: minValue < 0 && maxValue > 0,
      yTicks,
      xTicks,
      recessionBands,
      baaLine: linePath(points, "baa", x, y),
      hyLine: linePath(points, "hy", x, y),
    };
  }, [points, recessions]);

  const isInspecting = hoverIndex !== null;
  const activePoint = hoverIndex === null ? points[points.length - 1] : points[hoverIndex];
  const activeX = chart && activePoint ? chart.x(new Date(activePoint.date).getTime()) : 0;
  const headline = num(activePoint?.hy) ?? num(activePoint?.baa);
  const activeY = chart && headline !== null ? chart.y(headline) : 0;
  const customRangeInvalid = Boolean(customStart && customEnd && customStart > customEnd);

  if (!chart || !activePoint || headline === null) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
        Run <code className="text-neutral-200">python3 scripts/CreditSpread.py</code> to generate
        interactive chart data at <code className="text-neutral-200">public/data/credit_spread.json</code>.
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 sm:p-6">
      <div className="flex flex-col gap-5 border-b border-neutral-900 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-base font-bold text-white">
              High Yield Credit Spread{latestDataParen(maxDate)}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Current: HY OAS {latestHy != null ? formatSpread(latestHy) : "—"}
              {" · Baa "}
              {latestBaa != null ? formatSpread(latestBaa) : "—"}
            </p>
            <p className="mt-2 text-4xl font-bold text-white">{formatSpread(headline)}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {formatDate(activePoint.date)}
              {num(activePoint.hy) !== null ? " · HY " + formatSpread(activePoint.hy as number) : ""}
              {num(activePoint.baa) !== null ? " · Baa " + formatSpread(activePoint.baa as number) : ""}
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

        <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 bg-[#d6d6d6]" />
            Baa − 10Y
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 bg-[#e07a5f]" />
            High yield OAS
          </span>
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
              setActiveRange("Max");
              setHoverIndex(null);
            }}
            className="h-10 rounded-md border border-neutral-900 px-4 text-sm font-semibold text-neutral-400 transition hover:border-neutral-700 hover:text-white"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden" onMouseLeave={() => setHoverIndex(null)}>
        <svg
          viewBox={"0 0 " + width + " " + height}
          role="img"
          aria-label="High yield credit spread and Baa minus 10-year Treasury"
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
            <g key={"l" + tick.value}>
              <line x1={pad.left} x2={width - pad.right} y1={tick.y} y2={tick.y} stroke="#262626" strokeWidth="1" />
              <text x={pad.left - 14} y={tick.y + 4} fill="#737373" fontSize="13" textAnchor="end">
                {formatSpread(tick.value)}
              </text>
            </g>
          ))}
          {chart.xTicks.map((tick) => (
            <text key={tick.date} x={tick.x} y={height - 18} fill="#d4d4d4" fontSize="14" fontWeight="700" textAnchor="middle">
              {formatShortDate(tick.date)}
            </text>
          ))}
          {chart.showZero ? (
            <line x1={pad.left} x2={width - pad.right} y1={chart.zeroY} y2={chart.zeroY} stroke="#ef4444" strokeDasharray="7 7" strokeWidth="1.4" />
          ) : null}
          <path d={chart.baaLine} fill="none" stroke="#d6d6d6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d={chart.hyLine} fill="none" stroke="#e07a5f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {isInspecting ? (
            <>
              <line x1={activeX} x2={activeX} y1={pad.top} y2={height - pad.bottom} stroke="#525252" strokeWidth="1" />
              <circle cx={activeX} cy={activeY} r="5" fill="#e07a5f" stroke="#0a0a0a" strokeWidth="2" />
              <g transform={"translate(" + Math.min(activeX + 16, width - 230) + " " + Math.max(activeY - 72, 18) + ")"}>
                <rect width="210" height="78" rx="6" fill="#171717" stroke="#404040" />
                <text x="12" y="22" fill="#d4d4d4" fontSize="13">{formatDate(activePoint.date)}</text>
                <text x="12" y="44" fill="#e07a5f" fontSize="15" fontWeight="700">
                  HY {num(activePoint.hy) !== null ? formatSpread(activePoint.hy as number) : "—"}
                </text>
                <text x="12" y="64" fill="#d6d6d6" fontSize="14">
                  Baa {num(activePoint.baa) !== null ? formatSpread(activePoint.baa as number) : "—"}
                </text>
              </g>
            </>
          ) : null}
        </svg>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-500">
        Silver: Moody&apos;s Baa corporate yield minus the 10-year Treasury (BAA10Y). Orange: ICE BofA US High Yield OAS
        (BAMLH0A0HYM2). FRED only publishes about three years of the ICE series as of 2026.
        {latestBaa != null ? " Latest Baa " + formatSpread(latestBaa) + "." : ""}
        {latestHy != null ? " Latest HY " + formatSpread(latestHy) + "." : ""}
        {updatedAt ? " Updated " + formatDate(updatedAt) + "." : ""}
      </p>
    </section>
  );
}
