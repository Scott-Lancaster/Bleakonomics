export type ChartStamp = {
  as_of?: string | null;
  updated_at?: string | null;
  observations?: Array<{ date?: string }>;
};

export function latestObservationDate(data: ChartStamp): string | null {
  if (typeof data.as_of === "string" && data.as_of) return data.as_of;
  const observations = data.observations;
  if (Array.isArray(observations) && observations.length > 0) {
    const last = observations[observations.length - 1]?.date;
    if (last) return last;
  }
  return typeof data.updated_at === "string" ? data.updated_at : null;
}

export function formatLatestData(date: string): string {
  const parsed = new Date(date.slice(0, 10) + "T12:00:00");
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.getMonth() + 1 + "/" + parsed.getDate() + "/" + String(parsed.getFullYear()).slice(-2);
}

export function LatestDataStamp({
  data,
  className,
}: {
  data: ChartStamp;
  className?: string;
}) {
  const latest = latestObservationDate(data);
  if (!latest) return null;
  return (
    <span className={"font-normal tracking-normal text-neutral-500 " + (className ?? "text-xs")}>
      (Latest Data - {formatLatestData(latest)})
    </span>
  );
}

export function ChartHeading({ title, data }: { title: string; data: ChartStamp }) {
  return (
    <h3 className="text-lg font-semibold text-neutral-300">
      {title}{" "}
      <LatestDataStamp data={data} />
    </h3>
  );
}

export function ChartPageTitle({ title }: { title: string }) {
  return <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">{title}</h1>;
}

export function latestDataParen(date: string | null | undefined) {
  if (!date) return "";
  return " (Latest Data - " + formatLatestData(date) + ")";
}
