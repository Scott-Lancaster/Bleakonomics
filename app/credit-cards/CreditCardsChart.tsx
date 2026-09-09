'use client';

import { useMemo, useState } from "react";

type Observation = {
  date: string;
  value: number;
  nominal?: number | null;
  adjusted?: number | null;
  m2?: number | null;
};

type Recession = {
  start: string;
  end: string;
};

type CreditCardsChartProps = {
  observations: Observation[];
  recessions: Recession[];
  latest: number | null;
  latestAdjusted?: number | null;
  baseDate?: string | null;
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
const pad = { top: 34, right: 78, bottom: 54, left: 78 };

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

function formatBillions(value: number) {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : 1;
  return (value < 0 ? "-$" : "$") + abs.toFixed(digits) + "B";
}

function num(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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

export default function CreditCardsChart({
  observations,
  recessions,
  latest,
  latestAdjusted,
  baseDate,
  updatedAt,
}: CreditCardsChartProps) {
  const cleanObservations = useMemo(
    () =>
      observations
        .filter((point) => Number.isFinite(point.nominal ?? point.value))
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
    const nominals = points.map((point) => num(point.nominal ?? point.value));
    const adjusteds = points.map((point) => num(point.adjusted));
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const minValue = 0;
    const maxValue = Math.max(...nominals, 0) * 1.12;
    const adjMin = 0;
    const adjMax = Math.max(...adjusteds, 0) * 1.12;

    const x = (time: number) =>
      pad.left + ((time - minTime) / (maxTime - minTime)) * (width - pad.left - pad.right);
    const y = (value: number) =>
      pad.top + ((maxValue - value) / (maxValue - minValue)) * (height - pad.top - pad.bottom);
    const yAdj = (value: number) =>
      pad.top + ((adjMax - value) / (adjMax - adjMin)) * (height - pad.top - pad.bottom);

    const nominalLine = points
      .map((point, index) => {
        const command = index === 0 ? "M" : "L";
        return command + " " + x(times[index]).toFixed(2) + " " + y(nominals[index]).toFixed(2);
      })
      .join(" ");
    const adjustedLine = points
      .map((point, index) => {
        const command = index === 0 ? "M" : "L";
        return command + " " + x(times[index]).toFixed(2) + " " + yAdj(adjusteds[index]).toFixed(2);
      })
      .join(" ");

    const yTicks = Array.from({ length: 6 }, (_, index) => {
      const value = minValue + ((maxValue - minValue) / 5) * index;
      return { value, y: y(value) };
    });
    const adjTicks = Array.from({ length: 6 }, (_, index) => {
      const value = adjMin + ((adjMax - adjMin) / 5) * index;
      return { value, y: yAdj(value) };
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

    return { x, y, yAdj, yTicks, adjTicks, xTicks, nominalLine, adjustedLine, recessionBands };
  }, [points, recessions]);

  const isInspecting = hoverIndex !== null;
  const activePoint = hoverIndex === null ? points[points.length - 1] : points[hoverIndex];
  const activeX = chart && activePoint ? chart.x(new Date(activePoint.date).getTime()) : 0;
  const customRangeInvalid = Boolean(customStart && customEnd && customStart > customEnd);

  if (!chart || !activePoint) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
        Run <code className="text-neutral-200">python3 scripts/CreditCards.py</code> to generate
        interactive chart data at <code className="text-neutral-200">public/data/credit_cards.json</code>.
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 sm:p-6">
      <div className="flex flex-col gap-5 border-b border-neutral-900 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Credit card debt
            </p>
            <p className="mt-2 text-4xl font-bold text-white">
              {formatBillions(num(activePoint.nominal ?? activePoint.value))}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              {formatDate(activePoint.date)}
              {typeof activePoint.adjusted === "number" ? " · M2-adjusted " + formatBillions(activePoint.adjusted) : ""}
              {isInspecting && latest !== null ? " · Latest: " + formatBillions(latest) : ""}
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
            Actual
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 bg-[#e07a5f]" />
            M2-adjusted
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
          aria-label="Credit card debt in dollars with an M2-adjusted series on a second axis"
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
          <path
            d={chart.nominalLine}
            fill="none"
            stroke="#d6d6d6"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={chart.adjustedLine}
            fill="none"
            stroke="#e07a5f"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {chart.yTicks.map((tick) => (
            <g key={"l" + tick.value}>
              <line x1={pad.left} x2={width - pad.right} y1={tick.y} y2={tick.y} stroke="#262626" strokeWidth="1" />
              <text x={pad.left - 14} y={tick.y + 4} fill="#737373" fontSize="13" textAnchor="end">
                {formatBillions(tick.value)}
              </text>
            </g>
          ))}
          {chart.adjTicks.map((tick) => (
            <text key={"r" + tick.value} x={width - pad.right + 8} y={tick.y + 4} fill="#e07a5f" fontSize="12">
              {formatBillions(tick.value)}
            </text>
          ))}
          {chart.xTicks.map((tick) => (
            <text key={tick.date} x={tick.x} y={height - 18} fill="#737373" fontSize="13" textAnchor="middle">
              {formatShortDate(tick.date)}
            </text>
          ))}
          {isInspecting ? (
            <>
              <line x1={activeX} x2={activeX} y1={pad.top} y2={height - pad.bottom} stroke="#525252" strokeWidth="1" />
              <circle
                cx={activeX}
                cy={chart.y(num(activePoint.nominal ?? activePoint.value))}
                r="5"
                fill="#d6d6d6"
                stroke="#0a0a0a"
                strokeWidth="2"
              />
              <g transform={"translate(" + Math.min(activeX + 16, width - 240) + " 18)"}>
                <rect width="220" height="78" rx="6" fill="#171717" stroke="#404040" />
                <text x="12" y="22" fill="#d4d4d4" fontSize="13">{formatDate(activePoint.date)}</text>
                <text x="12" y="44" fill="#ffffff" fontSize="15" fontWeight="700">
                  {formatBillions(num(activePoint.nominal ?? activePoint.value))}
                </text>
                <text x="12" y="64" fill="#e07a5f" fontSize="14">
                  M2-adj {typeof activePoint.adjusted === "number" ? formatBillions(activePoint.adjusted) : "—"}
                </text>
              </g>
            </>
          ) : null}
        </svg>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-500">
        Left axis: actual credit-card and revolving balances at commercial banks (CCLACBW027SBOG, $B).
        Right axis: the same balances held against M2 growth
        {baseDate ? " from " + formatDate(baseDate) : ""}.
        If card debt and M2 rise at the same speed, orange is flat.
        The 2010 jump is mostly FAS 166/167 accounting, not a household borrowing spike.
        {latestAdjusted != null ? " Latest M2-adjusted " + formatBillions(latestAdjusted) + "." : ""}
        {updatedAt ? " Updated " + formatDate(updatedAt) + "." : ""}
      </p>
    </section>
  );
}
