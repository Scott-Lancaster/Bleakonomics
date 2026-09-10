'use client';

import { useMemo, useState } from "react";
import { latestDataParen } from "../../components/LatestDataStamp";

type Observation = {
  date: string;
  value: number;
  us?: number | null;
  europe?: number | null;
  china?: number | null;
  japan?: number | null;
  total?: number | null;
  yoy?: number | null;
};

type Recession = {
  start: string;
  end: string;
};

type M2ChartProps = {
  observations: Observation[];
  recessions: Recession[];
  latest: number | null;
  latestYoy?: number | null;
  shares?: {
    us?: number | null;
    europe?: number | null;
    china?: number | null;
    japan?: number | null;
  };
  globalSharePct?: number | null;
  globalYear?: number | null;
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

const regions = [
  { key: "japan", label: "Japan", color: "#6f9e78" },
  { key: "europe", label: "Europe", color: "#5b8fc7" },
  { key: "us", label: "United States", color: "#d6d6d6" },
  { key: "china", label: "China", color: "#c4a35a" },
] as const;

const width = 1100;
const height = 560;
const pad = { top: 34, right: 78, bottom: 54, left: 72 };

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

function formatTrillions(value: number) {
  const abs = Math.abs(value);
  const digits = abs >= 10 ? 1 : 2;
  return (value < 0 ? "-$" : "$") + abs.toFixed(digits) + "T";
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

export default function M2Chart({
  observations,
  recessions,
  latest,
  shares,
  globalSharePct,
  globalYear,
  updatedAt,
}: M2ChartProps) {
  const cleanObservations = useMemo(
    () =>
      observations
        .filter((point) => Number.isFinite(point.total ?? point.value))
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
    const totals = points.map((point) => num(point.total ?? point.value));
    const regionValues = points.flatMap((point) => regions.map((region) => num(point[region.key])));
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const minValue = 0;
    const maxValue = Math.max(...regionValues, 0) * 1.12;
    const totalMin = 0;
    const totalMax = Math.max(...totals, 0) * 1.12;

    const x = (time: number) =>
      pad.left + ((time - minTime) / (maxTime - minTime)) * (width - pad.left - pad.right);
    const y = (value: number) =>
      pad.top + ((maxValue - value) / (maxValue - minValue)) * (height - pad.top - pad.bottom);
    const yTotal = (value: number) =>
      pad.top + ((totalMax - value) / (totalMax - totalMin)) * (height - pad.top - pad.bottom);

    const regionLines = regions.map((region) => {
      const d = points
        .map((point, index) => {
          const command = index === 0 ? "M" : "L";
          return command + " " + x(times[index]).toFixed(2) + " " + y(num(point[region.key])).toFixed(2);
        })
        .join(" ");
      return { key: region.key, color: region.color, d };
    });

    const totalLine = points
      .map((point, index) => {
        const command = index === 0 ? "M" : "L";
        return (
          command +
          " " +
          x(times[index]).toFixed(2) +
          " " +
          yTotal(num(point.total ?? point.value)).toFixed(2)
        );
      })
      .join(" ");

    const yTicks = Array.from({ length: 6 }, (_, index) => {
      const value = minValue + ((maxValue - minValue) / 5) * index;
      return { value, y: y(value) };
    });
    const totalTicks = Array.from({ length: 6 }, (_, index) => {
      const value = totalMin + ((totalMax - totalMin) / 5) * index;
      return { value, y: yTotal(value) };
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

    return { x, y, yTotal, yTicks, totalTicks, xTicks, regionLines, totalLine, recessionBands };
  }, [points, recessions]);

  const isInspecting = hoverIndex !== null;
  const activePoint = hoverIndex === null ? points[points.length - 1] : points[hoverIndex];
  const activeX = chart && activePoint ? chart.x(new Date(activePoint.date).getTime()) : 0;
  const customRangeInvalid = Boolean(customStart && customEnd && customStart > customEnd);

  if (!chart || !activePoint) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
        Run <code className="text-neutral-200">python3 scripts/M2.py</code> to generate
        interactive chart data at <code className="text-neutral-200">public/data/m2.json</code>.
      </div>
    );
  }

  const shareLine = shares
    ? [
        shares.china != null ? "China " + shares.china + "%" : null,
        shares.us != null ? "US " + shares.us + "%" : null,
        shares.europe != null ? "Europe " + shares.europe + "%" : null,
        shares.japan != null ? "Japan " + shares.japan + "%" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 sm:p-6">
      <div className="flex flex-col gap-5 border-b border-neutral-900 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-base font-bold text-white">
              {typeof globalSharePct === "number"
                ? "~" + Math.round(globalSharePct) + "% Of Global Money Supply Over Time In USD"
                : "Global Money Supply Over Time In USD"}
              {latestDataParen(maxDate)}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Last Total {formatTrillions(latest ?? num(activePoint.total ?? activePoint.value))}
            </p>
            <p className="mt-2 text-4xl font-bold text-white">
              {formatTrillions(num(activePoint.total ?? activePoint.value))}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {formatDate(activePoint.date)}
              {isInspecting && latest !== null ? " · Latest: " + formatTrillions(latest) : ""}
            </p>
            {shareLine ? (
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Of this basket: {shareLine}
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
          {regions.map((region) => (
            <span key={region.key} className="inline-flex items-center gap-2">
              <span className="h-0.5 w-4" style={{ background: region.color }} />
              {region.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-4 bg-[#e07a5f]" />
            Total
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
          aria-label="Regional money supply lines in dollars with four-region total on a second axis"
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
          {chart.regionLines.map((line) => (
            <path
              key={line.key}
              d={line.d}
              fill="none"
              stroke={line.color}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          <path
            d={chart.totalLine}
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
                {formatTrillions(tick.value)}
              </text>
            </g>
          ))}
          {chart.totalTicks.map((tick) => (
            <text key={"r" + tick.value} x={width - pad.right + 8} y={tick.y + 4} fill="#e07a5f" fontSize="12">
              {formatTrillions(tick.value)}
            </text>
          ))}
          {chart.xTicks.map((tick) => (
            <text key={tick.date} x={tick.x} y={height - 18} fill="#d4d4d4" fontSize="14" fontWeight="700" textAnchor="middle">
              {formatShortDate(tick.date)}
            </text>
          ))}
          {typeof globalSharePct === "number" ? (
            <text
              x={width - pad.right}
              y={pad.top - 12}
              fill="#d4d4d4"
              fontSize="13"
              fontWeight="600"
              textAnchor="end"
            >
              ≈{Math.round(globalSharePct)}% of global money supply
              {globalYear != null ? " (" + globalYear + ")" : ""}
            </text>
          ) : null}
          {isInspecting ? (
            <>
              <line x1={activeX} x2={activeX} y1={pad.top} y2={height - pad.bottom} stroke="#525252" strokeWidth="1" />
              <circle
                cx={activeX}
                cy={chart.yTotal(num(activePoint.total ?? activePoint.value))}
                r="5"
                fill="#e07a5f"
                stroke="#0a0a0a"
                strokeWidth="2"
              />
              <g transform={"translate(" + Math.min(activeX + 16, width - 260) + " " + Math.max(18, 18) + ")"}>
                <rect width="240" height="148" rx="6" fill="#171717" stroke="#404040" />
                <text x="12" y="22" fill="#d4d4d4" fontSize="13">{formatDate(activePoint.date)}</text>
                <text x="12" y="44" fill="#e07a5f" fontSize="16" fontWeight="700">
                  Total {formatTrillions(num(activePoint.total))}
                </text>
                {regions.map((region, index) => (
                  <text key={region.key} x="12" y={66 + index * 18} fill={region.color} fontSize="13">
                    {region.label}: {formatTrillions(num(activePoint[region.key]))}
                  </text>
                ))}
              </g>
            </>
          ) : null}
        </svg>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-500">
        Left axis: each region in USD trillions. Right axis: four-region total in USD trillions.
        US Fed M2, ECB M2, China M2, Japan broad money, converted at month-end FX.
        China after 2019 and Japan after late 2023 use World Bank annual (plus a PBOC May 2026 China print).
        {typeof globalSharePct === "number"
          ? "These four regions are about " +
            Math.round(globalSharePct) +
            "% of World Bank global broad money" +
            (globalYear != null ? " (" + globalYear + "). "
            : ". ")
          : "This basket is a lower bound on global M2. "}
        {updatedAt ? "Updated " + formatDate(updatedAt) + "." : ""}
      </p>
    </section>
  );
}
