type Grade = "A" | "B" | "C" | "D" | "F";

type DataGradeItem = {
  label: string;
  grade: Grade;
  description: string;
};

type DataGradeSectionProps = {
  items: DataGradeItem[];
};

const gradeStyles: Record<Grade, string> = {
  A: "border-emerald-700 bg-emerald-950 text-emerald-300",
  B: "border-lime-700 bg-lime-950 text-lime-300",
  C: "border-yellow-700 bg-yellow-950 text-yellow-300",
  D: "border-orange-700 bg-orange-950 text-orange-300",
  F: "border-red-700 bg-red-950 text-red-300",
};

export default function DataGradeSection({ items }: DataGradeSectionProps) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
      <h2 className="text-lg font-semibold text-white">Data Grade</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-3 rounded-md border border-neutral-900 bg-black p-4 sm:flex-row sm:items-start"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <p className="font-semibold text-white">{item.label}:</p>
              <span
                className={
                  "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-sm font-bold " +
                  gradeStyles[item.grade]
                }
              >
                {item.grade}
              </span>
              <p className="min-w-0 text-sm leading-6 text-neutral-400">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
