'use client';

import { useState } from "react";

type Paper = {
  title: string;
  url: string;
};

type ChartInfoButtonsProps = {
  summary: string;
  papers: Paper[];
};

export default function ChartInfoButtons({ summary, papers }: ChartInfoButtonsProps) {
  const [openPanel, setOpenPanel] = useState<"summary" | "papers" | null>(null);

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpenPanel(openPanel === "summary" ? null : "summary")}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-800 text-lg font-bold text-neutral-300 transition hover:border-neutral-600 hover:text-white"
        aria-label="Show chart summary"
      >
        ?
      </button>
      <button
        type="button"
        onClick={() => setOpenPanel(openPanel === "papers" ? null : "papers")}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-800 text-xl text-neutral-300 transition hover:border-neutral-600 hover:text-white"
        aria-label="Show related research papers"
      >
        🎓
      </button>

      {openPanel ? (
        <div className="absolute right-0 top-12 z-30 w-[min(34rem,calc(100vw-3rem))] rounded-lg border border-neutral-800 bg-neutral-950 p-4 shadow-2xl">
          {openPanel === "summary" ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Summary
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-300">{summary}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Papers
              </p>
              <div className="mt-3 grid gap-3">
                {papers.length > 0 ? (
                  papers.map((paper) => (
                    <a
                      key={paper.url}
                      href={paper.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block min-w-0 break-all rounded-md border border-neutral-900 bg-black px-3 py-2 text-sm leading-5 text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                    >
                      {paper.url}
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-neutral-400">Research links coming soon.</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
