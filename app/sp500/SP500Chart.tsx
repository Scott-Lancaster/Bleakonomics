'use client';

import { useMemo, useState } from "react";
import { latestDataParen } from "../../components/LatestDataStamp";

type Observation = {
  date: string;
  value?: number | null;
  spx?: number | null;
  ma200?: number | null;
  gold?: number | null;
  gold_oz?: number | null;
};

type Recession = {
  start: string;
  end: string;
};

type SP500ChartProps = {
  observations: Observation[];
  recessions: Recession[];
  latest: number | null;
  latestGoldOz?: number | null;
  latestMa200?: number | null;
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date.slice(0, 10) + "T12:00:00"));
}

function formatMonthYear(time: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(time));
}

function formatMonthDay(time: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(time));
}

function buildXTicks(
  minTime: number,
  maxTime: number,
  x: (time: number) => number,
) {
  const spanDays = (maxTime - minTime) / 86_400_000;
  const min = new Date(minTime);
  const max = new Date(maxTime);
  const ticks: Array<{ key: string; x: number; label: string }> = [];

  function add(time: number, label: string) {
    if (time < minTime || time > maxTime) return;
    ticks.push({ key: label + "-" + time, x: x(time), label });
  }

  if (spanDays >= 365 * 3) {
    const yearSpan = spanDays / 365.25;
    const step = yearSpan >= 36 ? 4 : yearSpan >= 8 ? 2 : 1;
    let year = min.getUTCFullYear();
    if (Date.UTC(year, 0, 1, 12) < minTime) year += 1;
    year = Math.ceil(year / step) * step;
    for (let y = year; y <= max.getUTCFullYear(); y += step) {
      const time = Date.UTC(y, 0, 1, 12);
      add(time, String(y));
    }
  } else if (spanDays >= 90) {
    const monthSpan =
      (max.getUTCFullYear() - min.getUTCFullYear()) * 12 +
      (max.getUTCMonth() - min.getUTCMonth());
    const step = monthSpan >= 18 ? 3 : monthSpan >= 9 ? 2 : 1;
    let year = min.getUTCFullYear();
    let month = min.getUTCMonth();
    if (min.getUTCDate() > 1) month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    while (month % step !== 0) month += 1;
    while (year < max.getUTCFullYear() || (year === max.getUTCFullYear() && month <= max.getUTCMonth())) {
      const time = Date.UTC(year, month, 1, 12);
      add(time, formatMonthYear(time));
      month += step;
      while (month >= 12) {
        month -= 12;
        year += 1;
      }
    }
  } else {
    const count = 5;
    for (let index = 0; index <= count; index += 1) {
      const time = minTime + ((maxTime - minTime) / count) * index;
      add(time, formatMonthDay(time));
    }
  }

  return ticks;
}

function toInputDate(date: string) {
  return date.slice(0, 10);
}

function num(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatIndex(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatIndexTick(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1000) return Math.round(value).toLocaleString("en-US");
  if (abs >= 100) return value.toFixed(0);
  return value.toFixed(1);
}

function formatOz(value: number) {
  return value.toFixed(2) + " oz";
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
  key: "spx" | "ma200" | "gold_oz",
  x: (time: number) => number,
  y: (value: number) => number,
) {
  return points
    .map((point, index) => {
      const value = num(point[key] ?? (key === "spx" ? point.value : null));
      if (value === null) return null;
      const prev = index === 0 ? null : num(points[index - 1][key] ?? (key === "spx" ? points[index - 1].value : null));
      const command = prev === null ? "M" : "L";
      return command + " " + x(new Date(point.date).getTime()).toFixed(2) + " " + y(value).toFixed(2);
    })
    .filter(Boolean)
    .join(" ");
}

function toggleClass(active: boolean) {
  return (
    "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition " +
    (active
      ? "border-white bg-white text-black"
      : "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white")
  );
}

export default function SP500Chart({
  observations,
  recessions,
  latest,
  latestGoldOz,
  latestMa200,
  updatedAt,
}: SP500ChartProps) {
  const cleanObservations = useMemo(
    () =>
      observations
        .filter((point) => num(point.spx) !== null || num(point.value) !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [observations],
  );

  const minDate = cleanObservations[0]?.date ?? "";
  const maxDate = cleanObservations[cleanObservations.length - 1]?.date ?? "";

  const [activeRange, setActiveRange] = useState("10Y");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showMa, setShowMa] = useState(true);
  const [showGold, setShowGold] = useState(true);

  const pad = { top: 34, right: showGold ? 78 : 34, bottom: 54, left: 72 };

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
    const preset = ranges.find((range) => range.label === activeRange) ?? ranges[5];
    const lastDate = new Date(cleanObservations[cleanObservations.length - 1].date);
    const cutoff = getPresetCutoff(preset, lastDate);
    if (!cutoff) return cleanObservations;
    return cleanObservations.filter((point) => new Date(point.date) >= cutoff);
  }, [activeRange, cleanObservations, customEnd, customStart]);

  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const times = points.map((point) => new Date(point.date).getTime());
    const leftValues = points.flatMap((point) => {
      const values = [num(point.spx) ?? num(point.value)];
      if (showMa) values.push(num(point.ma200));
      return values;
    }).filter((value): value is number => value !== null);
    const goldValues = points
      .map((point) => num(point.gold_oz))
      .filter((value): value is number => value !== null);

    if (leftValues.length === 0) return null;

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const rawMin = Math.min(...leftValues);
    const rawMax = Math.max(...leftValues);
    const padding = Math.max((rawMax - rawMin) * 0.12, 4);
    const minValue = Math.max(0, rawMin - padding);
    const maxValue = rawMax + padding;

    const goldMinRaw = goldValues.length ? Math.min(...goldValues) : 0;
    const goldMaxRaw = goldValues.length ? Math.max(...goldValues) : 1;
    const goldPad = Math.max((goldMaxRaw - goldMinRaw) * 0.12, 0.05);
    const goldMin = Math.max(0, goldMinRaw - goldPad);
    const goldMax = goldMaxRaw + goldPad;

    const x = (time: number) =>
      pad.left + ((time - minTime) / (maxTime - minTime || 1)) * (width - pad.left - pad.right);
    const y = (value: number) =>
      pad.top + ((maxValue - value) / (maxValue - minValue || 1)) * (height - pad.top - pad.bottom);
    const yGold = (value: number) =>
      pad.top + ((goldMax - value) / (goldMax - goldMin || 1)) * (height - pad.top - pad.bottom);

    const yTicks = Array.from({ length: 6 }, (_, index) => {
      const value = minValue + ((maxValue - minValue) / 5) * index;
      return { value, y: y(value) };
    });
    const goldTicks = Array.from({ length: 6 }, (_, index) => {
      const value = goldMin + ((goldMax - goldMin) / 5) * index;
      return { value, y: yGold(value) };
    });
    const xTicks = buildXTicks(minTime, maxTime, x);
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
      yGold,
      yTicks,
      goldTicks,
      xTicks,
      recessionBands,
      spxLine: linePath(points, "spx", x, y),
      maLine: linePath(points, "ma200", x, y),
      goldLine: linePath(points, "gold_oz", x, yGold),
    };
  }, [points, recessions, showGold, showMa, pad.left, pad.right]);

  const isInspecting = hoverIndex !== null;
  const activePoint = hoverIndex === null ? points[points.length - 1] : points[hoverIndex];
  const activeSpx = num(activePoint?.spx) ?? num(activePoint?.value);
  const activeX = chart && activePoint ? chart.x(new Date(activePoint.date).getTime()) : 0;
  const activeY = chart && activeSpx !== null ? chart.y(activeSpx) : 0;
  const customRangeInvalid = Boolean(customStart && customEnd && customStart > customEnd);
  const tooltipRows = 1 + (showMa ? 1 : 0) + (showGold ? 1 : 0);
  const tooltipHeight = 28 + tooltipRows * 22;

  if (!chart || !activePoint || activeSpx === null) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
        Run <code className="text-neutral-200">python3 scripts/SP500.py</code> to generate
        interactive chart data at <code className="text-neutral-200">public/data/sp500.json</code>.
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 sm:p-6">
      <div className="flex flex-col gap-5 border-b border-neutral-900 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-base font-bold text-white">
              S&P 500{latestDataParen(maxDate)}
            </p>
            <p className="mt-2 text-4xl font-bold text-white">{formatIndex(activeSpx)}</p>
            <p className="mt-1 text-sm text-neutral-400">
              {formatDate(activePoint.date)}
              {showGold && num(activePoint.gold_oz) !== null ? " · In gold " + formatOz(activePoint.gold_oz as number) : ""}
              {showMa && num(activePoint.ma200) !== null ? " · 200-day " + formatIndex(activePoint.ma200 as number) : ""}
              {isInspecting && latest !== null ? " · Latest: " + formatIndex(latest) : ""}
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

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-md border border-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-300">
            <span className="h-0.5 w-4 bg-[#e5e5e5]" />
            S&P 500
          </span>
          <button
            type="button"
            aria-pressed={showMa}
            onClick={() => setShowMa((value) => !value)}
            className={toggleClass(showMa)}
          >
            <span className={"h-0.5 w-4 " + (showMa ? "bg-[#e07a5f]" : "bg-neutral-700")} />
            200-Day MA
          </button>
          <button
            type="button"
            aria-pressed={showGold}
            onClick={() => setShowGold((value) => !value)}
            className={toggleClass(showGold)}
          >
            <span className={"h-0.5 w-4 " + (showGold ? "bg-[#c4a35a]" : "bg-neutral-700")} />
            Priced in Gold
          </button>
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
          aria-label="S&P 500 in dollars, optional 200-day moving average, and the index priced in gold"
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
                {formatIndexTick(tick.value)}
              </text>
            </g>
          ))}
          {showGold
            ? chart.goldTicks.map((tick) => (
                <text key={"r" + tick.value} x={width - pad.right + 8} y={tick.y + 4} fill="#c4a35a" fontSize="12">
                  {formatOz(tick.value)}
                </text>
              ))
            : null}
          {chart.xTicks.map((tick) => (
            <text key={tick.key} x={tick.x} y={height - 18} fill="#d4d4d4" fontSize="14" fontWeight="700" textAnchor="middle">
              {tick.label}
            </text>
          ))}
          <path
            d={chart.spxLine}
            fill="none"
            stroke="#e5e5e5"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {showMa && chart.maLine ? (
            <path
              d={chart.maLine}
              fill="none"
              stroke="#e07a5f"
              strokeWidth="2"
              strokeDasharray="7 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {showGold && chart.goldLine ? (
            <path
              d={chart.goldLine}
              fill="none"
              stroke="#c4a35a"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {isInspecting ? (
            <>
              <line x1={activeX} x2={activeX} y1={pad.top} y2={height - pad.bottom} stroke="#525252" strokeWidth="1" />
              <circle cx={activeX} cy={activeY} r="6" fill="#ffffff" stroke="#0a0a0a" strokeWidth="3" />
              <g transform={"translate(" + Math.min(activeX + 16, width - 250) + " " + Math.max(activeY - tooltipHeight - 10, 18) + ")"}>
                <rect width="230" height={tooltipHeight} rx="6" fill="#171717" stroke="#404040" />
                <text x="12" y="22" fill="#d4d4d4" fontSize="13">{formatDate(activePoint.date)}</text>
                <text x="12" y="44" fill="#ffffff" fontSize="16" fontWeight="700">
                  {formatIndex(activeSpx)}
                </text>
                {showMa ? (
                  <text x="12" y="66" fill="#e07a5f" fontSize="13">
                    200-day {num(activePoint.ma200) !== null ? formatIndex(activePoint.ma200 as number) : "—"}
                  </text>
                ) : null}
                {showGold ? (
                  <text x="12" y={showMa ? 86 : 66} fill="#c4a35a" fontSize="13">
                    In gold {num(activePoint.gold_oz) !== null ? formatOz(activePoint.gold_oz as number) : "—"}
                  </text>
                ) : null}
              </g>
            </>
          ) : null}
        </svg>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-500">
        White: S&P 500 close. Dashed orange: 200-day moving average of that close.
        Gold: the index divided by dollars per ounce of gold (ounces the index is worth).
        Gold uses monthly prints before August 2000, then COMEX futures.
        Red bands mark NBER recession periods.
        {latestGoldOz != null ? " Latest in gold " + formatOz(latestGoldOz) + "." : ""}
        {latestMa200 != null ? " Latest 200-day " + formatIndex(latestMa200) + "." : ""}
        {updatedAt ? " Updated " + formatDate(updatedAt) + "." : ""}
      </p>
    </section>
  );
}
